import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  CLOSED_SESSION_STATUSES,
  SESSION_STATUS_LABEL,
  SessionStatus,
} from 'src/common/enum/session-status.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import {
  AuthClient,
  AuthPatientProfile,
} from 'src/common/services/auth-client.service';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { SessionExerciseInputDto } from 'src/exercise/dto/create-exercise.dto';
import { Session } from './entities/session.entity';
import { SessionExercise } from './entities/session-exercise.entity';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import {
  CompleteSessionDto,
  CreateSessionDto,
  CreateTreatmentPlanDto,
  QuerySessionsDto,
  UpdateSessionDto,
} from './dto/create-session.dto';
import {
  SessionExerciseResponseDto,
  SessionResponseDto,
  TreatmentPlanResponseDto,
} from './dto/session-response.dto';
import { PaginatedDto } from 'src/common/dto/pagination.dto';

/** Bucket de duración que usa el filtro de la pantalla de sesiones. */
const DURATION_RANGES: Record<string, [number, number]> = {
  short: [0, 29],
  medium: [30, 45],
  long: [46, Number.MAX_SAFE_INTEGER],
};

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionExercise)
    private readonly sessionExerciseRepository: Repository<SessionExercise>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepository: Repository<TreatmentPlan>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    private readonly authClient: AuthClient,
    @InjectRepository(Exercise) private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  async create(
    dto: CreateSessionDto,
    defaultTherapistId: number,
  ): Promise<SessionResponseDto> {
    const patient = await this.patientProfileRepository.findOne({
      where: { patient_id: dto.patient_id },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    // El fisioterapeuta vive en auth: si no existe ahi, no existe.
    const therapistId = dto.therapist_id ?? defaultTherapistId;
    await this.authClient.assertTherapist(therapistId);

    const exercises = await this.resolveExercises(dto.exercises);

    const session = this.sessionRepository.create({
      patient_id: dto.patient_id,
      therapist_id: therapistId,
      title: dto.title,
      objective: dto.objective ?? null,
      scheduled_at: new Date(dto.scheduled_at),
      estimated_duration_minutes: dto.estimated_duration_minutes,
      status: dto.status ?? SessionStatus.DRAFT,
      observations: dto.observations ?? null,
      // El contador se congela al crear: es parte del histórico y no se
      // recalcula si después se edita la lista de ejercicios.
      total_exercises: exercises.length,
      total_repetitions: 0,
      total_duration_minutes: 0,
      progress_percentage: 0,
    });

    // Una sesión puede crearse directamente en un estado no inicial, porque la
    // app permite registrar historial de sesiones hechas fuera del sistema.
    this.applyLifecycleTimestamps(session);

    const saved = await this.sessionRepository.save(session);

    await this.sessionExerciseRepository.save(
      exercises.map(({ exercise, input }, index) =>
        this.sessionExerciseRepository.create({
          session_id: saved.session_id,
          exercise_id: exercise.exercise_id,
          position: index + 1,
          series: input.series ?? exercise.series,
          reps: input.reps ?? exercise.reps,
          measure_unit: exercise.measure_unit ?? ExerciseMeasureUnit.REPETITIONS,
          completed_repetitions: 0,
          progress_percentage: 0,
        }),
      ),
    );

    return this.findOne(saved.session_id);
  }

  async findAll(
    query: QuerySessionsDto,
  ): Promise<PaginatedDto<SessionResponseDto>> {
    // Sin join a `patient_profiles`: el nombre y el avatar viven en auth, no
    // en esta base. Se resuelven por REST, cacheados, solo para la pagina.
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.exercises', 'exercises')
      .leftJoinAndSelect('exercises.exercise', 'exercise');

    if (query.patient_id) {
      qb.andWhere('session.patient_id = :patientId', { patientId: query.patient_id });
    }

    if (query.status) {
      qb.andWhere('session.status = :status', { status: query.status });
    }

    // La app busca por título o por nombre del paciente. Ese nombre vive en
    // auth y no se filtra acá: el LIKE se queda solo contra el título.
    if (query.search) {
      qb.andWhere('LOWER(session.title) LIKE :search', {
        search: `%${query.search.toLowerCase()}%`,
      });
    }

    const range = query.duration_range ? DURATION_RANGES[query.duration_range] : undefined;

    if (range) {
      qb.andWhere(
        'session.estimated_duration_minutes BETWEEN :min AND :max',
        { min: range[0], max: range[1] },
      );
    }

    qb.orderBy('session.scheduled_at', 'DESC')
      .addOrderBy('exercises.position', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    const patients = await this.authClient.getPatientsByIds(
      rows.map((session) => session.patient_id),
    );

    return {
      items: rows.map((session) => this.toResponse(session, patients)),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  async findOne(sessionId: number): Promise<SessionResponseDto> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId },
      relations: { exercises: { exercise: true } },
    });

    if (!session) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    const patients = await this.authClient.getPatientsByIds([session.patient_id]);

    return this.toResponse(session, patients);
  }

  async update(sessionId: number, dto: UpdateSessionDto): Promise<SessionResponseDto> {
    const session = await this.loadForUpdate(sessionId);

    if (dto.title !== undefined) session.title = dto.title;
    if (dto.objective !== undefined) session.objective = dto.objective;
    if (dto.observations !== undefined) session.observations = dto.observations;
    if (dto.estimated_duration_minutes !== undefined) {
      session.estimated_duration_minutes = dto.estimated_duration_minutes;
    }

    if (dto.scheduled_at !== undefined) {
      session.scheduled_at = new Date(dto.scheduled_at);
    }

    if (dto.status !== undefined) {
      this.assertStatusTransition(session.status, dto.status);
      session.status = dto.status;
      this.applyLifecycleTimestamps(session);
    }

    if (dto.exercises) {
      await this.replaceExercises(session, dto.exercises);
    }

    await this.sessionRepository.save(session);

    return this.findOne(sessionId);
  }

  /**
   * El paciente arranca la sesión. Cierra la conexión de guante anterior si
   * quedó abierta.
   */
  async start(sessionId: number, patientId: number): Promise<SessionResponseDto> {
    const session = await this.loadForUpdate(sessionId);

    if (session.patient_id !== patientId) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    if (session.status === SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(ErrorMessages.SESSION_ALREADY_STARTED);
    }

    if (CLOSED_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestException(ErrorMessages.SESSION_ALREADY_STARTED);
    }

    session.status = SessionStatus.IN_PROGRESS;
    session.started_at = session.started_at ?? new Date();

    await this.sessionRepository.save(session);

    return this.findOne(sessionId);
  }

  /**
   * Cierra la sesión y recalcula los aggregates desde `repetition_logs`.
   *
   * Los totales se recalculan siempre desde la telemetría en vez de confiar en
   * lo que manda el cliente, para que el dashboard no pueda desincronizarse.
   */
  async complete(
    sessionId: number,
    dto: CompleteSessionDto,
  ): Promise<SessionResponseDto> {
    const session = await this.loadForUpdate(sessionId);

    if (dto.observations !== undefined) {
      session.observations = dto.observations;
    }

    const sessionExercises = await this.sessionExerciseRepository.find({
      where: { session_id: sessionId },
    });

    const completedRepetitions = sessionExercises.reduce(
      (acc, item) => acc + item.completed_repetitions,
      0,
    );

    const totalTarget = sessionExercises.reduce(
      (acc, item) => acc + item.series * item.reps,
      0,
    );

    session.total_repetitions = completedRepetitions;
    session.progress_percentage =
      totalTarget > 0
        ? Math.min(100, Math.round((completedRepetitions / totalTarget) * 10000) / 100)
        : 0;
    session.status = SessionStatus.COMPLETED;
    session.completed_at = new Date();
    session.started_at = session.started_at ?? session.scheduled_at;

    if (session.total_duration_minutes === 0) {
      const startedAt = session.started_at.getTime();
      const elapsedMinutes = Math.round((Date.now() - startedAt) / 60000);
      session.total_duration_minutes = Math.max(
        elapsedMinutes,
        Math.round(session.estimated_duration_minutes * 0.1),
      );
    }

    await this.sessionRepository.save(session);

    return this.findOne(sessionId);
  }

  async cancel(sessionId: number): Promise<SessionResponseDto> {
    const session = await this.loadForUpdate(sessionId);

    session.status = SessionStatus.CANCELLED;
    await this.sessionRepository.save(session);

    return this.findOne(sessionId);
  }

  /**
   * Actualiza el progreso de un ejercicio de la sesión a partir de lo que se
   * registró en `repetition_logs`.
   *
   * Lo llama el servicio de dispositivos después de grabar una repetición, para
   * que la lista de la pantalla de ejecución no tenga que recalcular.
   */
  async refreshSessionExerciseProgress(sessionExerciseId: number): Promise<void> {
    const sessionExercise = await this.sessionExerciseRepository.findOne({
      where: { session_exercise_id: sessionExerciseId },
    });

    if (!sessionExercise) return;

    const completed = await this.countRepetitions(sessionExerciseId);

    sessionExercise.completed_repetitions = completed;

    const target = sessionExercise.series * sessionExercise.reps;
    sessionExercise.progress_percentage =
      target > 0 ? Math.min(100, Math.round((completed / target) * 10000) / 100) : 0;

    await this.sessionExerciseRepository.save(sessionExercise);
  }

  private async countRepetitions(sessionExerciseId: number): Promise<number> {
// El conteo vive en `repetition_logs`; se resuelve acá por el id del
    // ejercicio de la sesión para no acoplarse al módulo de telemetría.
    const rows = await this.sessionExerciseRepository.query(
      'SELECT COUNT(*)::int AS total FROM repetition_logs WHERE session_exercise_id = $1',
      [sessionExerciseId],
    );

    return rows?.[0]?.total ?? 0;
  }

  async createPlan(
    dto: CreateTreatmentPlanDto,
    therapistId: number,
  ): Promise<TreatmentPlanResponseDto> {
    const patient = await this.patientProfileRepository.findOne({
      where: { patient_id: dto.patient_id },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    if (dto.session_id) {
      const session = await this.sessionRepository.findOne({
        where: { session_id: dto.session_id },
      });

      if (!session) {
        throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
      }
    }

    const plan = await this.planRepository.save(
      this.planRepository.create({
        patient_id: dto.patient_id,
        therapist_id: therapistId,
        session_id: dto.session_id ?? null,
        start_date: dto.start_date,
        frequency_per_week: dto.frequency_per_week,
        plan_duration_weeks: dto.plan_duration_weeks,
        notes: dto.notes ?? null,
        is_active: true,
      }),
    );

    return this.toPlanResponse(plan);
  }

  async findPlans(patientId: number): Promise<TreatmentPlanResponseDto[]> {
    const plans = await this.planRepository.find({
      where: { patient_id: patientId },
      order: { start_date: 'DESC' },
    });

    return plans.map((plan) => this.toPlanResponse(plan));
  }

  async findActivePlan(patientId: number): Promise<TreatmentPlanResponseDto | null> {
    const plan = await this.planRepository.findOne({
      where: { patient_id: patientId, is_active: true },
      order: { start_date: 'DESC' },
    });

    return plan ? this.toPlanResponse(plan) : null;
  }

  async deactivatePlan(planId: number): Promise<TreatmentPlanResponseDto> {
    const plan = await this.planRepository.findOne({ where: { plan_id: planId } });

    if (!plan) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    plan.is_active = false;
    await this.planRepository.save(plan);

    return this.toPlanResponse(plan);
  }

  /** Sesiones del paciente que todavía no se cerraron, para el badge del home. */
  async findOpenByPatient(patientId: number): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        patient_id: patientId,
        status: In([
          SessionStatus.DRAFT,
          SessionStatus.SCHEDULED,
          SessionStatus.IN_PROGRESS,
        ]),
      },
      relations: { exercises: { exercise: true } },
      order: { scheduled_at: 'ASC' },
    });

    const patients = await this.authClient.getPatientsByIds([patientId]);

    return sessions.map((session) => this.toResponse(session, patients));
  }

  private async loadForUpdate(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    return session;
  }

  /**
   * Resuelve los `exercise_code` del payload contra el catálogo.
   *
   * Los `series`/`reps` enviados son overrides: si no vienen se toma lo que
   * define el catálogo.
   */
  private async resolveExercises(inputs: SessionExerciseInputDto[]) {
    const codes = inputs.map((input) => input.exercise_code);
    const exercises = await this.exerciseRepository.find({ where: { code: In(codes) } });

    const byCode = new Map(exercises.map((exercise) => [exercise.code, exercise]));
    const missing = codes.filter((code) => !byCode.has(code));

    if (missing.length > 0) {
      throw new BadRequestException(
        `${ErrorMessages.INVALID_EXERCISE_ASSIGNMENT}: ${missing.join(', ')}`,
      );
    }

    const seen = new Set<string>();
    const duplicates = codes.filter((code) => {
      if (seen.has(code)) return true;
      seen.add(code);
      return false;
    });

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `${ErrorMessages.INVALID_EXERCISE_ASSIGNMENT}: ${[...new Set(duplicates)].join(', ')}`,
      );
    }

    return inputs.map((input) => ({ exercise: byCode.get(input.exercise_code), input }));
  }

  /** Sólo se puede editar la lista de ejercicios mientras no empezó. */
  private async replaceExercises(
    session: Session,
    inputs: SessionExerciseInputDto[],
  ): Promise<void> {
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException(ErrorMessages.SESSION_ALREADY_STARTED);
    }

    const resolved = await this.resolveExercises(inputs);

    await this.sessionExerciseRepository.delete({ session_id: session.session_id });

    await this.sessionExerciseRepository.save(
      resolved.map(({ exercise, input }, index) =>
        this.sessionExerciseRepository.create({
          session_id: session.session_id,
          exercise_id: exercise.exercise_id,
          position: index + 1,
          series: input.series ?? exercise.series,
          reps: input.reps ?? exercise.reps,
          measure_unit: exercise.measure_unit ?? ExerciseMeasureUnit.REPETITIONS,
          completed_repetitions: 0,
          progress_percentage: 0,
        }),
      ),
    );
  }

  /** Transiciones permitidas del ciclo de vida de una sesión. */
  private assertStatusTransition(from: SessionStatus, to: SessionStatus): void {
    if (from === to) return;

    const allowed: Record<SessionStatus, SessionStatus[]> = {
      [SessionStatus.DRAFT]: [SessionStatus.SCHEDULED, SessionStatus.CANCELLED],
      [SessionStatus.SCHEDULED]: [
        SessionStatus.IN_PROGRESS,
        SessionStatus.DRAFT,
        SessionStatus.CANCELLED,
      ],
      [SessionStatus.IN_PROGRESS]: [SessionStatus.COMPLETED, SessionStatus.CANCELLED],
      [SessionStatus.COMPLETED]: [],
      [SessionStatus.CANCELLED]: [SessionStatus.DRAFT],
    };

    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `No se puede pasar de ${SESSION_STATUS_LABEL[from]} a ${SESSION_STATUS_LABEL[to]}`,
      );
    }
  }

  /**
   * El estado del ciclo de vida y sus timestamps van juntos. `progress_snapshots`
   * agrupa por `sessions.completed_at::date`, así que una sesión COMPLETED sin
   * fecha sería invisible para el progreso, y el CHECK de la base lo rechaza.
   */
  private applyLifecycleTimestamps(session: Session): void {
    const now = new Date();

    if (session.status === SessionStatus.IN_PROGRESS && !session.started_at) {
      session.started_at = now;
    }

    if (session.status === SessionStatus.COMPLETED && !session.completed_at) {
      session.completed_at = now;
    }
  }

  /**
   * Nombre y avatar del paciente no estan en `patient_profiles`: llegan desde
   * auth en `patients`, ya cacheados por `AuthClient`.
   */
  private toResponse(
    session: Session,
    patients: Map<number, AuthPatientProfile> = new Map(),
  ): SessionResponseDto {
    const exercises = [...(session.exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => this.toExerciseResponse(item));

    const identity = patients.get(session.patient_id);

    return {
      id: session.session_id,
      patient_id: session.patient_id,
      patientName: identity?.full_name ?? null,
      patientAvatarUrl: identity?.avatar_url ?? null,
      therapist_id: session.therapist_id,
      title: session.title,
      objective: session.objective,
      scheduledAt: session.scheduled_at,
      durationMinutes: session.estimated_duration_minutes,
      status: session.status,
      statusLabel: SESSION_STATUS_LABEL[session.status] ?? session.status,
      exerciseCount: session.total_exercises,
      progress: Number(session.progress_percentage),
      totalRepetitions: session.total_repetitions,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      observations: session.observations,
      exercises: exercises.length > 0 ? exercises : undefined,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  private toExerciseResponse(item: SessionExercise): SessionExerciseResponseDto {
    return {
      id: item.session_exercise_id,
      code: item.exercise?.code,
      title: item.exercise?.title,
      imageUrl: item.exercise?.cover_image_url,
      series: item.series,
      reps: item.reps,
      measure_unit: item.measure_unit,
      setsAndReps:
        item.measure_unit === ExerciseMeasureUnit.SECONDS
          ? `${item.reps} seg`
          : `${item.series} series - ${item.reps} rep`,
      completedRepetitions: item.completed_repetitions,
      progressPercentage: Number(item.progress_percentage),
      averageForce:
        item.avg_force_newtons === null ? null : Number(item.avg_force_newtons),
      averageQuality: item.dominant_quality,
    };
  }

  private toPlanResponse(plan: TreatmentPlan): TreatmentPlanResponseDto {
    return {
      id: plan.plan_id,
      patient_id: plan.patient_id,
      session_id: plan.session_id,
      startDate: plan.start_date,
      frequencyPerWeek: plan.frequency_per_week,
      planDurationWeeks: plan.plan_duration_weeks,
      notes: plan.notes,
      is_active: plan.is_active,
    };
  }
}