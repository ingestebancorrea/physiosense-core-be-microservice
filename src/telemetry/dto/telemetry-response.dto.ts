import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QualityLevel } from 'src/common/enum/execution.enum';

export class RepetitionLogResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  session_exercise_id: number;

  @ApiProperty({ example: 'exercise_01' })
  exerciseCode: string;

  @ApiProperty()
  series_number: number;

  @ApiProperty()
  repetition_number: number;

  @ApiPropertyOptional({ example: 86.4 })
  avg_angle_degrees: number;

  @ApiPropertyOptional({ example: 91.2 })
  max_angle_degrees: number;

  @ApiPropertyOptional({ example: 14.8 })
  avg_force_newtons: number;

  @ApiProperty({ enum: QualityLevel })
  quality: QualityLevel;

  @ApiProperty({ example: true })
  is_in_target_range: boolean;

  @ApiProperty()
  completed_at: Date;
}

/** Resumen de una ejecución, como lo muestra la pantalla de ejecución. */
export class ExecutionSummaryDto {
  @ApiProperty()
  session_exercise_id: number;

  @ApiProperty({ example: 'exercise_01' })
  exerciseCode: string;

  @ApiProperty({ example: 'Cerrar la mano' })
  exerciseTitle: string;

  @ApiProperty({ example: 45 })
  completedRepetitions: number;

  @ApiProperty({ example: 60, description: 'series * reps' })
  targetRepetitions: number;

  @ApiProperty({ example: 75 })
  progressPercentage: number;

  @ApiPropertyOptional({ example: 13.9 })
  averageForce: number;

  @ApiPropertyOptional({ example: 78.4 })
  maxAngle: number;

  @ApiProperty({ enum: QualityLevel, example: QualityLevel.GOOD })
  dominantQuality: QualityLevel;

  @ApiProperty({
    example: 80,
    description: 'Porcentaje de repeticiones dentro del rango objetivo',
  })
  qualityPercentage: number;
}

export class IngestResultDto {
  @ApiProperty({ example: 12 })
  inserted: number;

  @ApiProperty({ example: 0, description: 'Repeticiones descartadas por duplicadas' })
  skipped: number;

  @ApiProperty({ type: ExecutionSummaryDto })
  summary: ExecutionSummaryDto;
}