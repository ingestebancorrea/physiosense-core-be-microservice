import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DominantHand } from 'src/common/enum/profile-role.enum';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';

/**
 * Estado del paciente dentro del programa de rehabilitación.
 *
 * La app móvil usa 'Activo' | 'Inactivo' (types/patient.ts) y los compara por
 * texto, así que la capa de respuestas expone `status_label` con esos mismos
 * strings. Ver PatientResponseDto.
 */
export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  [PatientStatus.ACTIVE]: 'Activo',
  [PatientStatus.INACTIVE]: 'Inactivo',
};

/**
 * Registro clínico del paciente.
 *
 * NO es el perfil de identidad: ese vive en authentication-be-microservice
 * (tabla `patients`, con patient_id propio). Acá `user_id` es el `users.id` de
 * ese servicio y se mantiene como entero sin FK, para que este microservicio
 * pueda vivir en su propia base de datos.
 *
 * Lo que se guarda acá es lo que la app necesita en las pantallas de lista y
 * detalle: diagnóstico, fecha de inicio y los tres scores de la tarjeta
 * (`metrics.compliance`, `metrics.rom`, `metrics.strength`).
 */
@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('increment')
  patient_id: number;

  // `users.id` de authentication-be-microservice. Sin constraint: la base es
  // de otro servicio.
  @Index('idx_patients_user_id', { unique: true })
  @Column({ type: 'int' })
  user_id: number;

  // Desnormalizado desde auth para pintar las tarjetas sin un join extra.
  // La fuente de verdad sigue siendo el microservicio de autenticación.
  @Column({ type: 'varchar', length: 120 })
  full_name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string;

  @Column({
    type: 'enum',
    enum: PatientStatus,
    enumName: 'patient_status_enum',
    default: PatientStatus.ACTIVE,
  })
  status: PatientStatus;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  // Fecha de arranque del tratamiento (`Patient.startDate`).
  @Column({ type: 'date', nullable: true })
  start_date: string;

  // Scores 0-100 de la tarjeta de paciente (`Patient.metrics`).
  // OJO: `rom_score` NO son grados. El ROM en grados vive en progress_snapshots.
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  compliance: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  rom_score: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  strength_score: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  // `DominantHand` viene de authentication-be-microservice: se comparte el
  // enum `dominant_hand_enum` para no divergir.
  @Column({
    type: 'enum',
    enum: DominantHand,
    enumName: 'dominant_hand_enum',
    nullable: true,
  })
  dominant_hand: DominantHand;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @OneToMany(() => TherapistPatient, (assignment) => assignment.patient)
  therapist_assignments: TherapistPatient[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}