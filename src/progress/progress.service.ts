import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  PROGRESS_PERIOD_LABEL,
  ProgressPeriod,
} from 'src/common/enum/progress.enum';
import {
  SESSION_STATUS_LABEL,
  SessionStatus,
} from 'src/common/enum/session-status.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { Patient } from 'src/patient/entities/patient.entity';
import { Session } from 'src/session/entities/session.entity';
import { ProgressSnapshot } from './entities/progress-snapshot.entity';
import {
  CompletedSessionPointDto,
  MotionChartPointDto,
  ProgressMetricDto,
  ProgressSessionExerciseDto,
  ProgressWindowDto,
  QueryProgressDto,
  SessionDetailProgressDto,
  SessionRecordDto,
} from './dto/progress.dto';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Una ventana temporal ya resuelta a fechas concretas. */
interface Window {
  start: Date;
  end: Date;
  /** Etiquetas del eje X, en orden. */
  slots: { label: string; start: Date; end: Date }[];
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressSnapshot)
    private readonly snapshotRepository: Repository<ProgressSnapshot>,
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Ventana(s) de progreso para el gráfico.
   *
   * Se calcula en vivo desde `sessions` + `repetition_logs` en lugar de leer
   * `progress_snapshots`: así el dashboard nunca queda desfasado si el paciente
   * entrenó y todavía no se materializó el snapshot. Los snapshots se usan
   * para auditoría y tendencia histórica (`materializeSnapshot`).
   */
  async getWindows(
    patientId: number,
    query: QueryProgressDto,
  ): Promise<ProgressWindowDto[]> {
    await this.assertPatient(patientId);

    const period = query.period ?? ProgressPeriod.WEEK;
    const windows: ProgressWindowDto[] = [];

    for (let index = query.offset; index < query.offset + query.windows; index += 1) {
      windows.push(await this.buildWindow(patientId, period, index));
    }

    return windows;
  }

  async getWindow(
    patientId: number,
    query: QueryProgressDto,
  ): Promise<ProgressWindowDto> {
    const [window] = await this.getWindows(patientId, {
      ...query,
      windows: 1,
    });

    return window;
  }

  /** Historial de sesiones para la lista de la pantalla de progreso. */
  async findRecords(patientId: number): Promise<SessionRecordDto[]> {
    await this.assertPatient(patientId);

    const sessions = await this.sessionRepository.find({
      where: { patient_id: patientId },
      order: { scheduled_at: 'DESC' },
    });

    return sessions.map((session) => ({
      id: `session_${session.session_id}`,
      date: this.formatLongDate(session.scheduled_at),
      duration: this.formatDuration(session.total_duration_minutes || session.estimated_duration_minutes),
      repetitions: session.total_repetitions,
      exerciseCount: session.total_exercises,
      status: this.toRecordStatus(session.status),
    }));
  }

  /** Detalle de una sesión, con el formato de `SessionDetail`. */
  async findSessionDetail(
    patientId: number,
    sessionId: number,
  ): Promise<SessionDetailProgressDto> {
    await this.assertPatient(patientId);

    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId, patient_id: patientId },
      relations: { exercises: { exercise: true } },
    });

    if (!session) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    const exercises: ProgressSessionExerciseDto[] = [...(session.exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.exercise?.code ?? `exercise_${item.exercise_id}`,
        name: item.exercise?.title ?? 'Ejercicio',
        setsAndReps:
          item.measure_unit === ExerciseMeasureUnit.SECONDS
            ? `${item.reps} seg`
            : `${item.series} series - ${item.reps} rep`,
        progressPercentage: Number(item.progress_percentage),
      }));

    return {
      id: `session_${session.session_id}`,
      date: this.formatLongDate(session.scheduled_at),
      status: SESSION_STATUS_LABEL[session.status],
      totalTime: this.formatDuration(
        session.total_duration_minutes || session.estimated_duration_minutes,
      ),
      totalReps: session.total_repetitions,
      overallProgress: Number(session.progress_percentage),
      exercises,
      observations: session.observations ?? undefined,
    };
  }

  /**
   * Persiste el snapshot de la ventana actual.
   *
   * Los deltas se calculan contra la ventana inmediatamente anterior, que es
   * como la app los muestra ('+12%').
   */
  async materializeSnapshot(
    patientId: number,
    period: ProgressPeriod,
  ): Promise<ProgressSnapshot> {
    await this.assertPatient(patientId);

    const bounds = this.resolveWindow(period, 0);
    const previousBounds = this.resolveWindow(period, 1);

    const [repetitions, minutes] = await this.totals(
      patientId,
      bounds.start,
      bounds.end,
    );
    const [previousRepetitions, previousMinutes] = await this.totals(
      patientId,
      previousBounds.start,
      previousBounds.end,
    );

    const rom = await this.rom(patientId, bounds.start, bounds.end);
    const completed = await this.countCompletedSessions(
      patientId,
      bounds.start,
      bounds.end,
    );
    // La adherencia se mide contra lo que el fisioterapeuta programó en la
    // ventana, así que las canceladas no cuentan como objetivo.
    const scheduled = await this.countScheduled(patientId, bounds.start, bounds.end);

    const snapshot = this.snapshotRepository.create({
      patient_id: patientId,
      period,
      period_start: this.toDateString(bounds.start),
      period_end: this.toDateString(bounds.end),
      total_repetitions: repetitions,
      total_minutes: minutes,
      repetitions_delta_pct: this.deltaPct(repetitions, previousRepetitions),
      minutes_delta_pct: this.deltaPct(minutes, previousMinutes),
      avg_rom_degrees: rom.avg,
      max_rom_degrees: rom.max,
      completed_sessions: completed,
      compliance_percentage:
        scheduled > 0
          ? Math.min(100, Math.round((completed / scheduled) * 10000) / 100)
          : null,
    });

    const existing = await this.snapshotRepository.findOne({
      where: {
        patient_id: patientId,
        period,
        period_start: snapshot.period_start,
      },
    });

    if (existing) {
      Object.assign(existing, snapshot);
      return this.snapshotRepository.save(existing);
    }

    return this.snapshotRepository.save(snapshot);
  }

  /** Sesiones no canceladas dentro del rango: el objetivo de adherencia. */
  private async countScheduled(
    patientId: number,
    start: Date,
    end: Date,
  ): Promise<number> {
    const row = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(*)', 'total')
      .where('session.patient_id = :patientId', { patientId })
      .andWhere('session.status != :cancelled', {
        cancelled: SessionStatus.CANCELLED,
      })
      .andWhere('session.scheduled_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return Number(row?.total ?? 0);
  }

  async findSnapshots(
    patientId: number,
    period: ProgressPeriod,
  ): Promise<ProgressSnapshot[]> {
    return this.snapshotRepository.find({
      where: { patient_id: patientId, period },
      order: { period_start: 'DESC' },
    });
  }

  private async buildWindow(
    patientId: number,
    period: ProgressPeriod,
    offset: number,
  ): Promise<ProgressWindowDto> {
    const bounds = this.resolveWindow(period, offset);
    const slots = bounds.slots;

    const motionPoints: MotionChartPointDto[] = [];
    const completedSessions: CompletedSessionPointDto[] = [];

    let totalRepetitions = 0;
    let totalMinutes = 0;

    for (const slot of slots) {
      const [repetitions, minutes] = await this.totals(patientId, slot.start, slot.end);
      const rom = await this.rom(patientId, slot.start, slot.end);
      const sessionCount = await this.countCompletedSessions(
        patientId,
        slot.start,
        slot.end,
      );

      const value = rom.avg === null ? 0 : Math.round(rom.avg);

      motionPoints.push({
        day: slot.label,
        value,
        label: rom.avg === null ? '--' : `${value}°`,
      });

      completedSessions.push({
        day: slot.label,
        count: sessionCount,
      });

      totalRepetitions += repetitions;
      totalMinutes += minutes;
    }

    const previousBounds = this.resolveWindow(period, offset + 1);
    const [previousRepetitions, previousMinutes] = await this.totals(
      patientId,
      previousBounds.start,
      previousBounds.end,
    );

    const metrics: ProgressMetricDto[] = [
      {
        title: 'Repeticiones',
        value: this.formatThousands(totalRepetitions),
        percentage: this.formatDelta(totalRepetitions, previousRepetitions),
        isPositive: totalRepetitions >= previousRepetitions,
      },
      {
        title: 'Tiempo total',
        value: this.formatDurationValue(totalMinutes),
        percentage: this.formatDelta(totalMinutes, previousMinutes),
        isPositive: totalMinutes >= previousMinutes,
      },
    ];

    return {
      dateRange: this.formatDateRange(bounds.start, bounds.end, period),
      motionPoints,
      metrics,
      completedSessions,
      period,
      periodLabel: PROGRESS_PERIOD_LABEL[period],
    };
  }

  /**
   * Resuelve la ventana `offset` períodos atrás de "hoy", junto con los slots
   * del eje X.
   *
   * Los slots replican lo que la app muestra: horas en Día, días en Semana,
   * semanas en Mes y trimestres en Año.
   */
  private resolveWindow(period: ProgressPeriod, offset: number): Window {
    const now = new Date();

    switch (period) {
      case ProgressPeriod.DAY: {
        const day = this.startOfDay(this.addDays(now, -offset));
        const slots = [8, 10, 12, 14, 16, 18].map((hour) => ({
          label: `${hour}:00`,
          start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour),
          end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 2),
        }));

        return { start: day, end: this.endOfDay(day), slots };
      }

      case ProgressPeriod.WEEK: {
        const weekStart = this.startOfWeek(this.addDays(now, -offset * 7));
        const slots = Array.from({ length: 7 }, (_, index) => {
          const start = this.addDays(weekStart, index);

          return {
            label: WEEKDAY_LABELS[start.getDay()],
            start,
            end: this.endOfDay(start),
          };
        });

        return {
          start: weekStart,
          end: this.endOfDay(this.addDays(weekStart, 6)),
          slots,
        };
      }

      case ProgressPeriod.MONTH: {
        const monthStart = this.startOfMonth(this.addMonths(now, -offset));
        const monthEnd = this.endOfMonth(monthStart);
        const totalDays = Math.round(
          (monthEnd.getTime() - monthStart.getTime()) / 86400000,
        ) + 1;
        // La app agrupa en 4 bloques fijos ('S1'..'S4').
        const blockSize = Math.ceil(totalDays / 4);

        const slots = Array.from({ length: 4 }, (_, index) => ({
          label: `S${index + 1}`,
          start: this.addDays(monthStart, index * blockSize),
          end: this.endOfDay(
            this.addDays(monthStart, Math.min((index + 1) * blockSize, totalDays) - 1),
          ),
        }));

        return { start: monthStart, end: monthEnd, slots };
      }

      case ProgressPeriod.YEAR: {
        const yearStart = new Date(now.getFullYear() - offset, 0, 1);
        const yearEnd = new Date(now.getFullYear() - offset, 11, 31, 23, 59, 59, 999);
        const slots = [0, 1, 2, 3].map((quarter) => ({
          label: `T${quarter + 1}`,
          start: new Date(yearStart.getFullYear(), quarter * 3, 1),
          end: new Date(yearStart.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999),
        }));

        return { start: yearStart, end: yearEnd, slots };
      }

      default:
        throw new Error(`Periodo no soportado: ${period}`);
    }
  }

  /** Repeticiones y minutos ejecutados en un rango. */
  private async totals(
    patientId: number,
    start: Date,
    end: Date,
  ): Promise<[number, number]> {
    const row = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COALESCE(SUM(session.total_repetitions), 0)', 'repetitions')
      .addSelect(
        'COALESCE(SUM(session.total_duration_minutes), 0)',
        'minutes',
      )
      .where('session.patient_id = :patientId', { patientId })
      .andWhere('session.status = :status', { status: SessionStatus.COMPLETED })
      .andWhere('session.completed_at BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return [Number(row?.repetitions ?? 0), Number(row?.minutes ?? 0)];
  }

  /** Rango de movimiento promedio y máximo, en grados. */
  private async rom(
    patientId: number,
    start: Date,
    end: Date,
  ): Promise<{ avg: number | null; max: number | null }> {
    const row = await this.snapshotRepository.query(
      `SELECT AVG(log.max_angle_degrees)::float AS avg,
              MAX(log.max_angle_degrees)::float AS max
         FROM repetition_logs log
        WHERE log.patient_id = $1
          AND log.completed_at BETWEEN $2 AND $3`,
      [patientId, start, end],
    );

    return {
      avg: row?.[0]?.avg === null || row?.[0]?.avg === undefined ? null : row[0].avg,
      max: row?.[0]?.max === null || row?.[0]?.max === undefined ? null : row[0].max,
    };
  }

  /**
   * Sesiones completadas en la ventana. Es un total, no un desglose por día: los
   * dos llamadores solo suman el resultado. Agrupar por `completed_at::date` solo
   * servía para leer un alias que la consulta no seleccionaba.
   */
  private async countCompletedSessions(
    patientId: number,
    start: Date,
    end: Date,
  ): Promise<number> {
    const row = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(*)', 'count')
      .where('session.patient_id = :patientId', { patientId })
      .andWhere('session.status = :status', { status: SessionStatus.COMPLETED })
      .andWhere('session.completed_at BETWEEN :start AND :end', { start, end })
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  private async assertPatient(patientId: number): Promise<void> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }
  }

  private deltaPct(current: number, previous: number): number | null {
    if (previous === 0) return null;

    return Math.round(((current - previous) / previous) * 10000) / 100;
  }

  /** La app siempre muestra el signo, y lo pinte en positivo o negativo. */
  private formatDelta(current: number, previous: number): string {
    const delta = this.deltaPct(current, previous);

    if (delta === null) return current > 0 ? 'nuevo' : '0%';

    return `${delta >= 0 ? '+' : ''}${delta}%`;
  }

  private formatThousands(value: number): string {
    return value.toLocaleString('es-ES');
  }

  private formatDurationValue(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest === 0 ? `${hours}h` : `${hours}h ${String(rest).padStart(2, '0')}m`;
  }

  private formatDuration(minutes: number): string {
    if (!minutes) return '0 min';

    return `${minutes} min`;
  }

  private formatLongDate(date: Date): string {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  /** '11 - 17 Mayo 2025', 'Mayo 2025', '2025' o '15 Mayo 2025'. */
  private formatDateRange(
    start: Date,
    end: Date,
    period: ProgressPeriod,
  ): string {
    switch (period) {
      case ProgressPeriod.DAY:
        return this.formatLongDate(start);

      case ProgressPeriod.WEEK:
        return `${start.getDate()} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;

      case ProgressPeriod.MONTH:
        return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;

      case ProgressPeriod.YEAR:
        return `${start.getFullYear()}`;

      default:
        return this.formatLongDate(start);
    }
  }

  private toDateString(date: Date | string): string {
    if (typeof date === 'string') return date.slice(0, 10);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private toRecordStatus(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.COMPLETED:
        return 'completed';
      case SessionStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'in_progress';
    }
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);

    next.setDate(next.getDate() + days);

    return next;
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private startOfWeek(date: Date): Date {
    const start = this.startOfDay(date);
    // La semana arranca en lunes, como los labels Lun..Dom del mock.
    const diff = (start.getDay() + 6) % 7;

    return this.addDays(start, -diff);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}