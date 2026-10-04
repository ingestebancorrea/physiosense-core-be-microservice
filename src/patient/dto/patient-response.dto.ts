import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DominantHand } from 'src/common/enum/profile-role.enum';
import { PatientStatus } from '../entities/patient.entity';

/**
 * Ficha clínica del paciente.
 *
 * Incluye los aliases en camelCase que la app ya usa en `Patient`, más los
 * campos crudos. Los textos formateados ("Hoy, 9:15 a. m.", "15 Abril, 2024")
 * NO se persisten: los arma el cliente a partir de las fechas.
 */
export class PatientResponseDto {
  @ApiProperty({ example: '1001' })
  id: number;

  @ApiProperty({ description: 'users.id del microservicio de autenticación' })
  user_id: number;

  @ApiProperty({ example: 'María López' })
  name: string;

  @ApiProperty({ example: 'maria.lopez@physiosense.co' })
  email: string;

  @ApiPropertyOptional()
  avatarUrl: string;

  @ApiPropertyOptional({ example: 32, description: 'Derivada de birth_date' })
  age: number;

  @ApiPropertyOptional({ example: '1992-08-12' })
  birthDate: string;

  @ApiProperty({ enum: PatientStatus })
  status: PatientStatus;

  @ApiProperty({
    example: 'Activo',
    description: 'Etiqueta en español, lista para pintar sin traducir nada',
  })
  statusLabel: string;

  @ApiPropertyOptional({ example: 'Tendinitis de mano derecha' })
  diagnosis: string;

  @ApiPropertyOptional({ example: '2024-04-15' })
  startDate: string;

  @ApiPropertyOptional({ example: 'Dr. Esteban Correa' })
  therapistName: string;

  @ApiPropertyOptional({ example: 78 })
  therapist_id: number;

  @ApiPropertyOptional({ example: 78 })
  compliance: number;

  @ApiPropertyOptional({ example: 65 })
  rom: number;

  @ApiPropertyOptional({ example: 82 })
  strength: number;

  @ApiPropertyOptional({ example: '+57 300 765 4321' })
  phone: string;

  @ApiPropertyOptional({ enum: DominantHand })
  dominantHand: DominantHand;

  @ApiPropertyOptional()
  notes: string;

  @ApiPropertyOptional({ example: 8, description: 'Ejercicios completados en la última sesión' })
  lastSessionCompletedExercises: number;

  @ApiPropertyOptional({ example: 10 })
  lastSessionTotalExercises: number;

  @ApiPropertyOptional({
    description: 'Timestamp de la última sesión; el texto "Hoy, 9:15 a. m." lo arma el cliente',
  })
  lastSessionAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}