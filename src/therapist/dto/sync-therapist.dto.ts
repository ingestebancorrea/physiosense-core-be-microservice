import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

/**
 * Sincroniza el read-model del fisioterapeuta desde
 * authentication-be-microservice.
 *
 * `user_id` es el `users.id` de auth; el resto viene del perfil profesional
 * (`physiotherapists`) y se copia para no depender de un llamada remota en cada
 * request de este servicio.
 */
export class SyncTherapistDto {
  @ApiProperty({ description: 'users.id del microservicio de autenticación' })
  @IsInt()
  @Min(1)
  user_id: number;

  @ApiProperty({ example: 'Dr. Esteban Correa' })
  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  full_name: string;

  @ApiPropertyOptional({ example: 'esteban.correa@physiosense.co' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatar_url: string;

  @ApiPropertyOptional({ example: 'Fisioterapia de mano' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  specialty: string;

  @ApiPropertyOptional({ example: 'LP-123456' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  license_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  institution: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 70 })
  @IsOptional()
  @IsInt()
  @Min(0)
  years_of_experience: number;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes: string;
}