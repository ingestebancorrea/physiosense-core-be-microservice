import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { DominantHand } from 'src/common/enum/profile-role.enum';
import { PatientStatus } from '../entities/patient.entity';

/**
 * Alta del registro clínico de un paciente.
 *
 * `user_id` NO se acepta desde afuera: se deriva del token, salvo que el
 * endpoint sea el de sincronización explícita desde el servicio de
 * autenticación.
 */
export class CreatePatientDto {
  @ApiProperty({ description: 'users.id del microservicio de autenticación' })
  @IsInt()
  @Min(1)
  user_id: number;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  full_name: string;

  @ApiPropertyOptional({ example: 'maria.lopez@physiosense.co' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatar_url: string;

  @ApiPropertyOptional({ example: '1992-08-12', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  birth_date: string;

  @ApiPropertyOptional({ enum: PatientStatus, default: PatientStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @ApiPropertyOptional({ example: 'Tendinitis de mano derecha' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
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

  @ApiPropertyOptional({ example: '+57 300 765 4321' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone: string;

  @ApiPropertyOptional({ enum: DominantHand })
  @IsOptional()
  @IsEnum(DominantHand)
  dominant_hand: DominantHand;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes: string;
}