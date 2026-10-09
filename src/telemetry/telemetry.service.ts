import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { QualityLevel } from 'src/common/enum/execution.enum';
import {
  calculateQuality,
  dominantQuality,
  qualityPercentage,
} from 'src/common/services/quality.service';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { Session } from 'src/session/entities/session.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { AuthClient, AuthUserProfile } from 'src/common/services/auth-client.service';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { RepetitionLog } from './entities/repetition-log.entity';
import { IngestRepetitionsDto } from './dto/telemetry.dto';
import {
  ExecutionSummaryDto,
  IngestResultDto,
  RepetitionLogResponseDto,
} from './dto/telemetry-response.dto';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(RepetitionLog)
    private readonly logRepository: Repository<RepetitionLog>,
    @InjectRepository(SessionExercise)
    private readonly sessionExerciseRepository: Repository<SessionExercise>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    private readonly authClient: AuthClient,
  ) {}

  /**
   * Persiste un lote de repeticiones y recalcula el resumen del ejercicio.
   *
   * Es idempotente por `(session_exercise_id, series_number, repetition_number)`:
   * si el teléfono reintenta el envío, las repeticiones repetidas se descartan
   * en vez de duplicar el conteo.
   */
  async ingestRepetitions(
    userId: number,
    dto: IngestRepetitionsDto,
  ): Promise<IngestResultDto> {
    const sessionExercise = await this.sessionExerciseRepository.findOne({
      where: { session_exercise_id: dto.session_exercise_id },
      relations: { session: true, exercise: true },
    });

    if (!sessionExercise) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    if (sessionExercise.session_id !== dto.session_id) {
      throw new BadRequestException(
        `${ErrorMessages.INVALID_EXERCISE_ASSIGNMENT}: el ejercicio de la sesión no pertenece a la sesión indicada`,
      );
    }

    // El guante es del paciente dueño de la sesión o del fisioterapeuta que la
    // supervisó, según quién esté reportando la telemetría.
    await this.assertSessionParticipant(sessionExercise.session, userId);

    // `FindOptionsWhere` no admite `OR`, y como las coordenadas siempre están
    // acotadas a un ejercicio de sesión, se cargan todas y se filtran en memoria.
    const existing = await this.logRepository.find({
      where: { session_exercise_id: sessionExercise.session_exercise_id },
      select: ['repetition_log_id', 'series_number', 'repetition_number'],
    });

    const seen = new Set(
      existing.map((log) => `${log.series_number}:${log.repetition_number}`),
    );

    const seenInBatch = new Set<string>();
    const rows: Partial<RepetitionLog>[] = [];

    for (const repetition of dto.repetitions) {
      const key = `${repetition.series_number}:${repetition.repetition_number}`;

      if (seen.has(key) || seenInBatch.has(key)) {
        continue;
      }

      seenInBatch.add(key);

      rows.push(
        this.logRepository.create({
          session_id: sessionExercise.session_id,
          session_exercise_id: sessionExercise.session_exercise_id,
          exercise_id: sessionExercise.exercise_id,
          patient_id: sessionExercise.session.patient_id,
          series_number: repetition.series_number,
          repetition_number: repetition.repetition_number,
          min_angle_degrees: repetition.min_angle_degrees ?? null,
          avg_angle_degrees: repetition.avg_angle_degrees ?? null,
          max_angle_degrees: repetition.max_angle_degrees ?? null,
          avg_force_newtons: repetition.avg_force_newtons ?? null,
          quality: repetition.quality,
          is_in_target_range: repetition.is_in_target_range ?? false,
          completed_at: repetition.completed_at
            ? new Date(repetition.completed_at)
            : new Date(),
        }),
      );
    }

    if (rows.length > 0) {
      await this.logRepository.save(rows);
    }

    const summary = await this.buildSummary(sessionExercise);

    // Se congela el agregado en la sesión para que la lista de ejecución no
    // tenga que recalcular en cada lectura.
    sessionExercise.completed_repetitions = summary.completedRepetitions;
    sessionExercise.progress_percentage = summary.progressPercentage;
    sessionExercise.avg_force_newtons = summary.averageForce ?? null;
    sessionExercise.dominant_quality = summary.dominantQuality;

    await this.sessionExerciseRepository.save(sessionExercise);

    return {
      inserted: rows.length,
      skipped: dto.repetitions.length - rows.length,
      summary,
    };
  }

  async findRepetitions(
    sessionExerciseId: number,
  ): Promise<RepetitionLogResponseDto[]> {
    const sessionExercise = await this.sessionExerciseRepository.findOne({
      where: { session_exercise_id: sessionExerciseId },
    });

    if (!sessionExercise) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    const exercise = await this.exerciseRepository.findOne({
      where: { exercise_id: sessionExercise.exercise_id },
    });

    const logs = await this.logRepository.find({
      where: { session_exercise_id: sessionExerciseId },
      order: { series_number: 'ASC', repetition_number: 'ASC' },
    });

    return logs.map((log) => ({
      id: log.repetition_log_id,
      session_exercise_id: log.session_exercise_id,
      exerciseCode: exercise?.code ?? `exercise_${log.exercise_id}`,
      series_number: log.series_number,
      repetition_number: log.repetition_number,
      avg_angle_degrees:
        log.avg_angle_degrees === null ? null : Number(log.avg_angle_degrees),
      max_angle_degrees:
        log.max_angle_degrees === null ? null : Number(log.max_angle_degrees),
      avg_force_newtons:
        log.avg_force_newtons === null ? null : Number(log.avg_force_newtons),
      quality: log.quality,
      is_in_target_range: log.is_in_target_range,
      completed_at: log.completed_at,
    }));
  }

  /** Resumen de la ejecución de un ejercicio de la sesión. */
  async getSummary(sessionExerciseId: number): Promise<ExecutionSummaryDto> {
    const sessionExercise = await this.sessionExerciseRepository.findOne({
      where: { session_exercise_id: sessionExerciseId },
      relations: { exercise: true },
    });

    if (!sessionExercise) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    return this.buildSummary(sessionExercise);
  }

  /**
   * Agrega las repeticiones al resumen del ejercicio.
   *
   * Los agregados se recalculan siempre desde `repetition_logs` en lugar de
   * acumular sobre el valor anterior, para que un reenvío del teléfono no
   * infle el promedio.
   */
  private async buildSummary(
    sessionExercise: SessionExercise,
  ): Promise<ExecutionSummaryDto> {
    const logs = await this.logRepository.find({
      where: { session_exercise_id: sessionExercise.session_exercise_id },
    });

    const forceValues = logs
      .map((log) => log.avg_force_newtons)
      .filter((value) => value !== null && value !== undefined)
      .map(Number);

    const maxAngles = logs
      .map((log) => log.max_angle_degrees)
      .filter((value) => value !== null && value !== undefined)
      .map(Number);

    const qualityCounts = logs.reduce<Partial<Record<QualityLevel, number>>>(
      (acc, log) => {
        acc[log.quality] = (acc[log.quality] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const target =
      sessionExercise.measure_unit === ExerciseMeasureUnit.SECONDS
        ? sessionExercise.reps
        : sessionExercise.series * sessionExercise.reps;

    const completed = logs.length;

    return {
      session_exercise_id: sessionExercise.session_exercise_id,
      exerciseCode: sessionExercise.exercise?.code ?? `exercise_${sessionExercise.exercise_id}`,
      exerciseTitle: sessionExercise.exercise?.title ?? 'Ejercicio',
      completedRepetitions: completed,
      targetRepetitions: target,
      progressPercentage:
        target > 0 ? Math.min(100, Math.round((completed / target) * 10000) / 100) : 0,
      averageForce: this.average(forceValues),
      maxAngle: maxAngles.length > 0 ? Math.max(...maxAngles) : null,
      dominantQuality: dominantQuality(qualityCounts),
      qualityPercentage: qualityPercentage(
        logs.filter((log) => log.is_in_target_range).length,
        completed,
      ),
    };
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;

    const sum = values.reduce((acc, value) => acc + value, 0);

    return Math.round((sum / values.length) * 100) / 100;
  }

  /** Clasifica una repetición en el servidor, para no depender del teléfono. */
  classify(
    angle: number,
    targetMin: number | null,
    targetMax: number | null,
  ): { quality: QualityLevel; isInTargetRange: boolean } {
    if (targetMin === null || targetMax === null) {
      return { quality: QualityLevel.REGULAR, isInTargetRange: false };
    }

    return {
      quality: calculateQuality(angle, Number(targetMin), Number(targetMax)),
      isInTargetRange: angle >= Number(targetMin) && angle <= Number(targetMax),
    };
  }

  /**
   * El guante solo lo usa el paciente de la sesión o su fisioterapeuta.
   *
   * Ni `patients.user_id` ni `therapists.user_id` existen en esta base: el rol
   * se resuelve contra auth con el `users.id` del token (cacheado 60 s).
   */
  private async assertSessionParticipant(
    session: Session,
    userId: number,
  ): Promise<void> {
    const profile = await this.resolveUserProfile(userId);

    const isPatient =
      profile.role_alias === ProfileRoleAlias.PATIENT &&
      profile.patient_id === session.patient_id;
    const isTherapist =
      profile.role_alias === ProfileRoleAlias.PHYSIOTHERAPIST &&
      profile.physiotherapist_id === session.therapist_id;

    if (!isPatient && !isTherapist) {
      throw new ForbiddenException(ErrorMessages.PATIENT_NOT_ASSIGNED);
    }
  }

  /** Un 404 de auth significa usuario inexistente: no es participante. */
  private async resolveUserProfile(userId: number): Promise<AuthUserProfile> {
    try {
      return await this.authClient.getUserProfile(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(ErrorMessages.PATIENT_NOT_ASSIGNED);
      }
      throw error;
    }
  }
}