import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/** Asigna (o reemplaza) al fisioterapeuta a cargo de un paciente. */
export class AssignTherapistDto {
  @ApiProperty({ description: 'therapists.therapist_id de este servicio' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  therapist_id: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

export class TherapistPatientResponseDto {
  @ApiProperty()
  assignment_id: number;

  @ApiProperty()
  patient_id: number;

  @ApiProperty()
  therapist_id: number;

  @ApiProperty()
  therapist_name: string;

  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  assigned_at: Date;
}