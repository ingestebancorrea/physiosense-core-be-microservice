import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AssessmentType,
  ClinicalRecordType,
  MAX_PAIN_SCALE,
  MAX_ROM_DEGREES,
  MIN_PAIN_SCALE,
  MIN_ROM_DEGREES,
} from 'src/common/enum/clinical.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

/** Nota de la ficha clínica del paciente. */
export class CreateClinicalRecordDto {
  @ApiProperty({ description: 'patients.patient_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiProperty({
    enum: ClinicalRecordType,
    example: ClinicalRecordType.EVOLUTION,
  })
  @IsEnum(ClinicalRecordType)
  type: ClinicalRecordType;

  @ApiPropertyOptional({ example: 'Evolución semana 4' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title: string;

  @ApiProperty({ example: 'El paciente refiere menos dolor y mayor rango.' })
  @IsString()
  @Length(1, 4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description: string;

  @ApiPropertyOptional({ example: 'https://cdn.physiosense.co/records/eval.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  document_url: string;

  @ApiPropertyOptional({ example: '2025-05-17T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  recorded_at: string;
}

/**
 * Evaluación clínica.
 *
 * `pain_scale` es la escala 0-10 y `rom_degrees` el rango articular en grados;
 * ambos acotan con los mínimos y máximos clínicos del enum.
 */
export class CreateAssessmentDto {
  @ApiProperty({ description: 'patients.patient_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiPropertyOptional({ enum: AssessmentType, default: AssessmentType.PERIODIC })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({ minimum: MIN_PAIN_SCALE, maximum: MAX_PAIN_SCALE, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_PAIN_SCALE)
  @Max(MAX_PAIN_SCALE)
  pain_scale: number;

  @ApiPropertyOptional({ minimum: MIN_ROM_DEGREES, maximum: MAX_ROM_DEGREES, example: 85 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MIN_ROM_DEGREES)
  @Max(MAX_ROM_DEGREES)
  rom_degrees: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  strength_newtons: number;

  @ApiPropertyOptional({ example: 78.5, description: 'Score global 0-100' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @ApiPropertyOptional({ example: '2025-05-17T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  assessed_at: string;
}

export class QueryClinicalRecordsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ClinicalRecordType })
  @IsOptional()
  @IsEnum(ClinicalRecordType)
  type?: ClinicalRecordType;

  @ApiPropertyOptional({ description: 'Busca en título y descripción' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}
