import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ProgressPeriod } from 'src/common/enum/progress.enum';

/**
 * Parámetros de la pantalla de progreso.
 *
 * `period` elige la periodicidad y `window` cuántas ventanas atrás traer, para
 * el carrusel que en la app viene precargado con 3-4 ventanas por periodo.
 */
export class QueryProgressDto {
  @ApiPropertyOptional({
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 12,
    description: 'Cuántas ventanas devolver, de la más reciente hacia atrás.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  windows = 1;

  @ApiPropertyOptional({
    default: 0,
    description: 'Cuántas ventanas saltar desde la más reciente.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class CreateProgressSnapshotDto {
  @ApiProperty({ enum: ProgressPeriod })
  @IsEnum(ProgressPeriod)
  period: ProgressPeriod;
}

/** Un punto del gráfico de rango de movimiento. */
export class MotionChartPointDto {
  @ApiProperty({ example: 'Lun', description: 'Etiqueta del eje, ya formateada' })
  day: string;

  @ApiProperty({ example: 48 })
  value: number;

  @ApiProperty({ example: '48°' })
  label: string;
}

/** Tarjeta de métrica: 'Repeticiones' / 'Tiempo total'. */
export class ProgressMetricDto {
  @ApiProperty({ example: 'Repeticiones' })
  title: string;

  @ApiProperty({ example: '820' })
  value: string;

  @ApiProperty({ example: '+12%' })
  percentage: string;

  @ApiProperty({ example: true })
  isPositive: boolean;
}

export class CompletedSessionPointDto {
  @ApiProperty({ example: 'Lun' })
  day: string;

  @ApiProperty({ example: 1 })
  count: number;
}

/**
 * `ProgressWindow` de la app (`types/progress.ts`).
 *
 * La ventana se devuelve tal cual la pinta `ProgressScreen`: el backend no
 * manda `activePeriod` porque ese estado vive en el cliente.
 */
export class ProgressWindowDto {
  @ApiProperty({ example: '11 - 17 Mayo 2025' })
  dateRange: string;

  @ApiProperty({ type: [MotionChartPointDto] })
  motionPoints: MotionChartPointDto[];

  @ApiProperty({ type: [ProgressMetricDto] })
  metrics: ProgressMetricDto[];

  @ApiProperty({ type: [CompletedSessionPointDto] })
  completedSessions: CompletedSessionPointDto[];

  @ApiPropertyOptional({ enum: ProgressPeriod })
  period: ProgressPeriod;

  @ApiPropertyOptional({ enum: ProgressPeriod, example: ProgressPeriod.WEEK })
  periodLabel: string;
}

/** Fila del historial: `SessionRecord` de la app. */
export class SessionRecordDto {
  @ApiProperty({ example: 'session_01' })
  id: string;

  @ApiProperty({ example: '15 Mayo 2025' })
  date: string;

  @ApiProperty({ example: '45 min' })
  duration: string;

  @ApiProperty({ example: 120 })
  repetitions: number;

  @ApiProperty({ example: 3 })
  exerciseCount: number;

  @ApiProperty({
    example: 'completed',
    enum: ['completed', 'in_progress', 'cancelled'],
  })
  status: string;
}

/** Ejercicio dentro del detalle: `Exercise` de `types/progress.ts`. */
export class ProgressSessionExerciseDto {
  @ApiProperty({ example: 'exercise_01' })
  id: string;

  @ApiProperty({ example: 'Cerrar la mano' })
  name: string;

  @ApiProperty({ example: '3 series - 15 rep' })
  setsAndReps: string;

  @ApiProperty({ example: 80 })
  progressPercentage: number;
}

/** Detalle de sesión: `SessionDetail` de la app. */
export class SessionDetailProgressDto {
  @ApiProperty({ example: 'session_01' })
  id: string;

  @ApiProperty({ example: '15 Mayo 2025' })
  date: string;

  @ApiProperty({
    example: 'Completada',
    enum: ['Completada', 'Pendiente', 'Incompleta'],
  })
  status: string;

  @ApiProperty({ example: '45 min' })
  totalTime: string;

  @ApiProperty({ example: 120 })
  totalReps: number;

  @ApiProperty({ example: 62 })
  overallProgress: number;

  @ApiProperty({ type: [ProgressSessionExerciseDto] })
  exercises: ProgressSessionExerciseDto[];

  @ApiPropertyOptional()
  observations?: string;
}
