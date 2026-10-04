import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  DEVICE_STATUS_LABEL,
  DeviceStatus,
  SMART_GLOVE_NAME,
} from 'src/common/enum/device.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { QualityLevel } from 'src/common/enum/execution.enum';
import {
  calculateQuality,
  dominantQuality,
  qualityPercentage,
} from 'src/common/services/quality.service';
import { Session } from 'src/session/entities/session.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';
import { Device } from './entities/device.entity';
import { DeviceSession } from './entities/device-session.entity';
import { RepetitionLog } from './entities/repetition-log.entity';
import {
  ConnectDeviceDto,
  DisconnectDeviceDto,
  IngestRepetitionsDto,
  RegisterDeviceDto,
} from './dto/device.dto';
import {
  DeviceResponseDto,
  DeviceSessionResponseDto,
  ExecutionSummaryDto,
  IngestResultDto,
  RepetitionLogResponseDto,
} from './dto/device-response.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device) private readonly deviceRepository: Repository<Device>,
    @InjectRepository(DeviceSession)
    private readonly deviceSessionRepository: Repository<DeviceSession>,
    @InjectRepository(RepetitionLog)
    private readonly logRepository: Repository<RepetitionLog>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionExercise)
    private readonly sessionExerciseRepository: Repository<SessionExercise>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Therapist)
    private readonly therapistRepository: Repository<Therapist>,
  ) {}

  // ------------------------------------------------------------- devices

  async register(dto: RegisterDeviceDto, ownerUserId: number): Promise<DeviceResponseDto> {
    const existing = await this.deviceRepository.findOne({
      where: { serial_number: dto.serial_number },
    });

    const device = existing
      ? this.deviceRepository.merge(existing, {
          name: dto.name ?? existing.name,
          firmware_version: dto.firmware_version ?? existing.firmware_version,
          owner_user_id: ownerUserId,
          owner_patient_id: dto.owner_patient_id ?? existing.owner_patient_id,
          last_seen_at: new Date(),
        })
      : this.deviceRepository.create({
          serial_number: dto.serial_number,
          name: dto.name ?? SMART_GLOVE_NAME,
          firmware_version: dto.firmware_version ?? null,
          status: dto.status ?? DeviceStatus.DISCONNECTED,
          battery_level: dto.battery_level ?? null,
          owner_user_id: ownerUserId,
          owner_patient_id: dto.owner_patient_id ?? null,
          last_seen_at: new Date(),
        });

    return this.toResponse(await this.deviceRepository.save(device));
  }

  async findAll(ownerUserId: number): Promise<DeviceResponseDto[]> {
    const devices = await this.deviceRepository.find({
      where: { owner_user_id: ownerUserId },
      order: { last_seen_at: 'DESC' },
    });

    return devices.map((device) => this.toResponse(device));
  }

  async findOne(deviceId: number, ownerUserId: number): Promise<DeviceResponseDto> {
    return this.toResponse(await this.loadOwned(deviceId, ownerUserId));
  }

  async updateStatus(
    deviceId: number,
    ownerUserId: number,
    status: DeviceStatus,
    batteryLevel?: number,
  ): Promise<DeviceResponseDto> {
    const device = await this.loadOwned(deviceId, ownerUserId);

    device.status = status;
    device.last_seen_at = new Date();

    if (batteryLevel !== undefined) {
      device.battery_level = batteryLevel;
    }

    return this.toResponse(await this.deviceRepository.save(device));
  }

  async remove(deviceId: number, ownerUserId: number): Promise<void> {
    const device = await this.loadOwned(deviceId, ownerUserId);

    await this.deviceRepository.remove(device);
  }

  // ------------------------------------------------------ device sessions

  /**
   * Abre una conexión del guante para una sesión.
   *
   * Si el guante ya tenía una conexión abierta de otra sesión, se cierra antes:
   * el dispositivo sólo puede estar en una sesión a la vez.
   */
  async connect(
    deviceId: number,
    ownerUserId: number,
    dto: ConnectDeviceDto,
  ): Promise<DeviceSessionResponseDto> {
    const device = await this.loadOwned(deviceId, ownerUserId);

    const session = await this.sessionRepository.findOne({
      where: { session_id: dto.session_id },
    });

    if (!session) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    await this.closeOpenSessions(deviceId, dto.battery_start);

    const deviceSession = await this.deviceSessionRepository.save(
      this.deviceSessionRepository.create({
        device_id: deviceId,
        session_id: dto.session_id,
        patient_id: session.patient_id,
        battery_start: dto.battery_start ?? device.battery_level ?? null,
      }),
    );

    device.status = DeviceStatus.CONNECTED;
    device.last_seen_at = new Date();

    if (dto.battery_start !== undefined) {
      device.battery_level = dto.battery_start;
    }

    await this.deviceRepository.save(device);

    return this.toSessionResponse(deviceSession);
  }

  async disconnect(
    deviceId: number,
    ownerUserId: number,
    dto: DisconnectDeviceDto,
  ): Promise<DeviceSessionResponseDto> {
    const device = await this.loadOwned(deviceId, ownerUserId);

    const open = await this.deviceSessionRepository.findOne({
      where: { device_id: deviceId, disconnected_at: null },
      order: { connected_at: 'DESC' },
    });

    if (!open) {
      throw new NotFoundException(ErrorMessages.DEVICE_NOT_CONNECTED);
    }

    open.disconnected_at = new Date();

    if (dto.battery_end !== undefined) {
      open.battery_end = dto.battery_end;
    }

    await this.deviceSessionRepository.save(open);

    device.status = DeviceStatus.DISCONNECTED;
    device.last_seen_at = new Date();

    if (dto.battery_end !== undefined) {
      device.battery_level = dto.battery_end;
    }

    await this.deviceRepository.save(device);

    return this.toSessionResponse(open);
  }

  async findDeviceSessions(
    deviceId: number,
    ownerUserId: number,
  ): Promise<DeviceSessionResponseDto[]> {
    await this.loadOwned(deviceId, ownerUserId);

    const sessions = await this.deviceSessionRepository.find({
      where: { device_id: deviceId },
      order: { connected_at: 'DESC' },
    });

    return sessions.map((session) => this.toSessionResponse(session));
  }

  // ---------------------------------------------------------- telemetría

  /**
   * Persiste un lote de repeticiones y recalcula el resumen del ejercicio.
   *
   * Es idempotente por `(session_exercise_id, series_number, repetition_number)`:
   * si el teléfono reintenta el envío, las repeteciones repetidas se descartan
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

    // El guante es del paciente dueño de la sesión o del fisioterapia que la
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

  private async closeOpenSessions(
    deviceId: number,
    batteryEnd?: number,
  ): Promise<void> {
    const open = await this.deviceSessionRepository.find({
      where: { device_id: deviceId, disconnected_at: null },
    });

    if (open.length === 0) return;

    for (const session of open) {
      session.disconnected_at = new Date();

      if (batteryEnd !== undefined) {
        session.battery_end = batteryEnd;
      }
    }

    await this.deviceSessionRepository.save(open);
  }

  /** El guante sólo lo usa el paciente de la sesión o su fisioterapeuta. */
  private async assertSessionParticipant(
    session: Session,
    userId: number,
  ): Promise<void> {
    const [patient, therapist] = await Promise.all([
      this.patientRepository.findOne({ where: { user_id: userId } }),
      this.therapistRepository.findOne({ where: { user_id: userId } }),
    ]);

    const isPatient =
      patient !== null && patient.patient_id === session.patient_id;
    const isTherapist =
      therapist !== null && therapist.therapist_id === session.therapist_id;

    if (!isPatient && !isTherapist) {
      throw new ForbiddenException(ErrorMessages.PATIENT_NOT_ASSIGNED);
    }
  }

  private async loadOwned(deviceId: number, ownerUserId: number): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { device_id: deviceId, owner_user_id: ownerUserId },
    });

    if (!device) {
      throw new NotFoundException(ErrorMessages.DEVICE_NOT_FOUND);
    }

    return device;
  }

  private toResponse(device: Device): DeviceResponseDto {
    return {
      id: device.device_id,
      serial_number: device.serial_number,
      name: device.name,
      firmware_version: device.firmware_version,
      status: device.status,
      statusLabel: DEVICE_STATUS_LABEL[device.status] ?? device.status,
      battery_level: device.battery_level,
      owner_user_id: device.owner_user_id,
      owner_patient_id: device.owner_patient_id,
      last_seen_at: device.last_seen_at,
    };
  }

  private toSessionResponse(
    session: DeviceSession,
  ): DeviceSessionResponseDto {
    const end = session.disconnected_at ?? new Date();

    return {
      id: session.device_session_id,
      device_id: session.device_id,
      session_id: session.session_id,
      patient_id: session.patient_id,
      connected_at: session.connected_at,
      disconnected_at: session.disconnected_at,
      battery_start: session.battery_start,
      battery_end: session.battery_end,
      durationMinutes: Math.max(
        0,
        Math.round((end.getTime() - session.connected_at.getTime()) / 60000),
      ),
    };
  }
}
