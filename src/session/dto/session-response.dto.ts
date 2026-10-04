import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { QualityLevel } from 'src/common/enum/execution.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';

export class SessionExerciseResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'exercise_01' })
  code: string;

  @ApiProperty({ example: 'Cerrar la mano' })
  title: string;

  @ApiPropertyOptional({ example: 'glove.png' })
  imageUrl: string;

  @ApiProperty({ example: 3 })
  series: number;

  @ApiProperty({ example: 15 })
  reps: number;

  @ApiProperty({ enum: ExerciseMeasureUnit })
  measure_unit: ExerciseMeasureUnit;

  @ApiProperty({ example: '3 series - 15 rep', description: 'Texto listo para pintar' })
  setsAndReps: string;

  @ApiProperty({ example: 0 })
  completedRepetitions: number;

  @ApiProperty({ example: 0 })
  progressPercentage: number;

  @ApiPropertyOptional({ example: 24.5 })
  averageForce: number;

  @ApiPropertyOptional({ enum: QualityLevel, example: 'Buena' })
  averageQuality: QualityLevel;
}

export class SessionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  patient_id: number;

  @ApiProperty({ example: 'María López' })
  patientName: string;

  @ApiPropertyOptional()
  patientAvatarUrl: string;

  @ApiProperty()
  therapist_id: number;

  @ApiProperty({ example: 'Sesión de seguimiento - Semana 4' })
  title: string;

  @ApiPropertyOptional()
  objective: string;

  @ApiProperty({ example: '2025-05-17T10:30:00.000Z' })
  scheduledAt: Date;

  @ApiProperty({
    example: 40,
    description: 'Minutos estimados. El texto "40 min" lo arma el cliente.',
  })
  durationMinutes: number;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiProperty({ example: 'Activa', description: 'Etiqueta en español para la app' })
  statusLabel: string;

  @ApiProperty({ example: 8 })
  exerciseCount: number;

  @ApiProperty({ example: 62 })
  progress: number;

  @ApiProperty({ example: 120 })
  totalRepetitions: number;

  @ApiPropertyOptional()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt: Date;

  @ApiPropertyOptional()
  observations: string;

  @ApiPropertyOptional({ type: [SessionExerciseResponseDto] })
  exercises: SessionExerciseResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TreatmentPlanResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  patient_id: number;

  @ApiPropertyOptional()
  session_id: number;

  @ApiProperty({ example: '2025-05-20' })
  startDate: string;

  @ApiProperty({ example: 3, description: 'La app lo muestra como "3 veces por semana"' })
  frequencyPerWeek: number;

  @ApiProperty({ example: 4, description: 'La app lo muestra como "4 semanas"' })
  planDurationWeeks: number;

  @ApiPropertyOptional()
  notes: string;

  @ApiProperty()
  is_active: boolean;
}