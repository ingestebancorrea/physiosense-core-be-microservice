import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { SessionExerciseInputDto } from 'src/exercise/dto/create-exercise.dto';

export class CreateSessionDto {
  @ApiProperty({ description: 'patients.patient_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiPropertyOptional({
    description: 'Fisioterapeuta responsable. Por defecto, el autenticado.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  therapist_id?: number;

  @ApiProperty({ example: 'Sesión de seguimiento - Semana 4' })
  @IsString()
  @Length(2, 160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    example: 'Mejorar fuerza y rango de movimiento de la muñeca.',
  })
  @IsOptional()
  @IsString()
  objective: string;

  @ApiProperty({
    example: '2025-05-17T10:30:00.000Z',
    description:
      'La app arma `${selectedDate} - ${selectedTime}`; acá se exige ISO 8601 para no adivinar el locale.',
  })
  @IsDateString()
  scheduled_at: string;

  @ApiProperty({ example: 40, minimum: 1, maximum: 240 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  estimated_duration_minutes: number;

  @ApiPropertyOptional({ enum: SessionStatus, default: SessionStatus.DRAFT })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiProperty({ type: [SessionExerciseInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseInputDto)
  exercises: SessionExerciseInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ example: '2025-05-18T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  estimated_duration_minutes?: number;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ type: [SessionExerciseInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseInputDto)
  exercises?: SessionExerciseInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

/** Cierra la sesión y consolida los aggregates de la ejecución. */
export class CompleteSessionDto {
  @ApiPropertyOptional({ example: 'Buen trabajo. Mantener la constancia.' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class QuerySessionsDto {
  @ApiPropertyOptional({ description: 'patients.patient_id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id?: number;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({
    description: 'short = <30 min, medium = 30-45 min, long = >45 min',
    enum: ['short', 'medium', 'long'],
  })
  @IsOptional()
  @IsString()
  duration_range?: string;

  @ApiPropertyOptional({ description: 'Busca por título o por nombre del paciente' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

/** Plan de tratamiento (pantalla "Asignar sesión"). */
export class CreateTreatmentPlanDto {
  @ApiProperty({ description: 'patients.patient_id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiPropertyOptional({ description: 'sessions.session_id a agrupar en el plan' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id?: number;

  @ApiPropertyOptional({ example: '2025-05-20', description: 'YYYY-MM-DD' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 14 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14)
  frequency_per_week: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 104 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  plan_duration_weeks: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}