import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PatientStatus } from '../entities/patient-profile.entity';

/**
 * Alta de la ficha clinica local de un paciente.
 *
 * La identidad NO se acepta desde afuera: nombre, email, avatar, telefono,
 * nacimiento y mano dominante viven en authentication-be-microservice y se
 * consultan por REST. Lo unico que se recibe es el `patient_id` de ahi (para
 * saber de que paciente hablamos) y los campos clinicos propios de este
 * servicio.
 */
export class CreatePatientDto {
  @ApiProperty({
    description:
      'patients.patient_id del microservicio de autenticacion. Es el id con el que auth conoce al paciente.',
  })
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiPropertyOptional({ enum: PatientStatus, default: PatientStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @ApiPropertyOptional({ example: 'Tendinitis de mano derecha' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  diagnosis: string;

  @ApiPropertyOptional({ example: '2024-04-15', description: 'Fecha de inicio del tratamiento' })
  @IsOptional()
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  compliance?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description: 'Score de ROM 0-100. Los grados van en progress_snapshots.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rom_score?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  strength_score?: number;

  @ApiPropertyOptional({
    description: 'Notas del fisioterapeuta. Las notas del paciente (auth) llegan por REST.',
  })
  @IsOptional()
  @IsString()
  notes: string;
}
