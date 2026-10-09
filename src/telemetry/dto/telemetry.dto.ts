import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { QualityLevel } from 'src/common/enum/execution.enum';

/**
 * Una repetición registrada por el guante.
 *
 * El teléfono manda el AGREGADO de la repetición (la app tomaba una muestra cada
 * 60 ms y las consolidaba al terminar), no cada muestra: guardar 16 filas por
 * segundo sería inviable.
 */
export class RepetitionLogDto {
  @ApiProperty({ example: 1, description: 'Número de serie (base 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  series_number: number;

  @ApiProperty({ example: 3, description: 'Repetición dentro de la serie' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  repetition_number: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 180, example: 42.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(180)
  min_angle_degrees?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 180, example: 86.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(180)
  avg_angle_degrees?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 180, example: 91.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(180)
  max_angle_degrees?: number;

  @ApiPropertyOptional({ minimum: 0, example: 14.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  avg_force_newtons?: number;

  @ApiPropertyOptional({ enum: QualityLevel })
  @IsOptional()
  @IsEnum(QualityLevel)
  quality: QualityLevel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  is_in_target_range?: boolean;

  @ApiPropertyOptional({ example: '2025-05-17T10:35:00.000Z' })
  @IsOptional()
  @IsDateString()
  completed_at?: string;
}

/**
 * Lote de repeticiones de una sesión.
 *
 * El guante no tiene conectividad propia: el teléfono acumula y manda el lote
 * al terminar cada serie.
 */
export class IngestRepetitionsDto {
  @ApiProperty({ description: 'sessions.session_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id: number;

  @ApiProperty({ description: 'session_exercises.session_exercise_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_exercise_id: number;

  @ApiProperty({ type: [RepetitionLogDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RepetitionLogDto)
  repetitions: RepetitionLogDto[];
}