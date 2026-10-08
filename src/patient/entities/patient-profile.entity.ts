import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TherapistPatient } from './therapist-patient.entity';

/**
 * Estado del paciente dentro del programa de rehabilitacion.
 *
 * La app movil usa 'Activo' | 'Inactivo' (types/patient.ts) y los compara por
 * texto, asi que la capa de respuestas expone `status_label` con esos mismos
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
 * Ficha clinica local del paciente.
 *
 * NO es el perfil de identidad: ese vive en authentication-be-microservice y
 * se trae por REST (AuthClient). `patient_id` es el `patients.patient_id` de
 * ahi, por eso la clave es una columna simple y no una secuencia, y por eso no
 * hay FK hacia la base de origen.
 *
 * Lo que se guarda acá es lo que este servicio necesita entre requests y no
 * esta en auth: estado, diagnostico, fecha de inicio, notas y los tres scores
 * de la tarjeta (`metrics.compliance`, `metrics.rom`, `metrics.strength`).
 * Nombre, email, avatar, telefono, nacimiento y mano dominante NO: se resuelven
 * por REST en cada lectura.
 *
 * La fila se crea perezosamente (`PatientsService.ensureProfile`) en el primer
 * write que la necesita.
 */
@Entity('patient_profiles')
export class PatientProfile {
  /** `patients.patient_id` de authentication-be-microservice. */
  @PrimaryColumn({ type: 'int' })
  patient_id: number;

  @Index('idx_patient_profiles_status')
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

  // Notas del fisioterapeuta. No son las de auth: esas llegan por REST en
  // `AuthPatientProfile.notes`.
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Baja local: oculta al paciente de las listas sin tocar la cuenta de auth.
  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @OneToMany(() => TherapistPatient, (assignment) => assignment.patient)
  therapist_assignments: TherapistPatient[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
