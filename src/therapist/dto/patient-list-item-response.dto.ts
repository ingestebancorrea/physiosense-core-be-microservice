import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DominantHand } from 'src/common/enum/profile-role.enum';
import { PatientStatus } from 'src/patient/entities/patient-profile.entity';

/**
 * Fila de la lista "mis pacientes" de un fisioterapeuta.
 *
 * Es el cruce de dos fuentes: la ficha clínica local (`patient_profiles`) y la
 * relación de asignación (`therapist_patients`), que viajan en la consulta a
 * TypeORM, más la identidad que `AuthClient` trae por lote desde
 * authentication-be-microservice (nombre, correo, avatar, teléfono).
 *
 * Los aliases en camelCase respetan el contrato que la app ya usa en
 * `Patient`/`PatientResponseDto`; los campos de la asignación van en snake_case
 * igual que `TherapistPatientResponseDto`.
 */
export class PatientListItemResponseDto {
  @ApiProperty({ example: 1001, description: 'patients.patient_id de auth' })
  id: number;

  @ApiProperty({ description: 'users.id del microservicio de autenticación' })
  user_id: number | null;

  @ApiProperty({ example: 'María López' })
  name: string | null;

  @ApiProperty({ example: 'maria.lopez@physiosense.co' })
  email: string | null;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiPropertyOptional({ example: 32, description: 'Derivada de birth_date' })
  age: number | null;

  @ApiPropertyOptional({ example: '1992-08-12' })
  birthDate: string | null;

  @ApiProperty({ enum: PatientStatus })
  status: PatientStatus;

  @ApiProperty({
    example: 'Activo',
    description: 'Etiqueta en español, lista para pintar sin traducir nada',
  })
  statusLabel: string;

  @ApiPropertyOptional({ example: 'Tendinitis de mano derecha' })
  diagnosis: string | null;

  @ApiPropertyOptional({ example: '2024-04-15' })
  startDate: string | null;

  @ApiPropertyOptional({ example: 78, description: 'Score local 0-100' })
  compliance: number | null;

  @ApiPropertyOptional({ example: 65, description: 'Score local 0-100, no son grados' })
  rom: number | null;

  @ApiPropertyOptional({ example: 82, description: 'Score local 0-100' })
  strength: number | null;

  @ApiPropertyOptional({ example: '+57 300 765 4321' })
  phone: string | null;

  @ApiPropertyOptional({ enum: DominantHand })
  dominantHand: DominantHand | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty({ description: 'Baja local en patient_profiles' })
  is_active: boolean;

  @ApiProperty({ description: 'Fisioterapeuta principal del paciente' })
  is_primary: boolean;

  @ApiProperty()
  assigned_at: Date;
}
