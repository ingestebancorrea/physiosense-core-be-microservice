import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { SessionExercise } from './session-exercise.entity';
import { TreatmentPlan } from './treatment-plan.entity';

/**
 * Sesión de tratamiento.
 *
 * Consolida los cuatro vocabularios de estado que la app tenía repartidos en
 * `SessionStatus` (types/session.ts), `SessionRecord.status`
 * (types/progress.ts) y `LastSession.status` (types/dashboard.ts). Acá se
 * persiste un único enum y la capa de respuestas expone `status_label`.
 *
 * Sobre `total_exercises`: la app lo muestra como `Session.exerciseCount` y en
 * los mocks NUNCA coincide con `exercises.length` (s001 declara 8 con 7
 * ítems). Se persiste como columna propia, congelada al crear la sesión, y no
 * se recalcula al borrar ejercicios: el contador es parte del histórico.
 */
@Entity('sessions')
@Index('idx_sessions_patient_scheduled', ['patient_id', 'scheduled_at'])
@Index('idx_sessions_therapist_status', ['therapist_id', 'status'])
export class Session {
  @PrimaryGeneratedColumn('increment')
  session_id: number;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => PatientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientProfile;

  // physiotherapists.physiotherapist_id de authentication-be-microservice.
  // Sin relacion: `therapists` no existe en esta base (se resuelve por REST).
  @Column({ type: 'int' })
  therapist_id: number;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  objective: string;

  // La app arma la fecha con `${selectedDate} - ${selectedTime}` en un solo
  // string; acá se separa en un timestamp real.
  @Column({ type: 'timestamptz' })
  scheduled_at: Date;

  @Column({ type: 'int', default: 40 })
  estimated_duration_minutes: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    enumName: 'session_status_enum',
    default: SessionStatus.DRAFT,
  })
  status: SessionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  // Se derivan de repetition_logs al cerrar la sesión; se guardan para no
  // recalcular los aggregates en cada lectura del dashboard.
  @Column({ type: 'int', default: 0 })
  total_repetitions: number;

  @Column({ type: 'int', default: 0 })
  total_exercises: number;

  @Column({ type: 'int', default: 0 })
  total_duration_minutes: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  progress_percentage: number;

  // Notas del fisioterapeuta al cerrar (`SessionDetail.observations`).
  @Column({ type: 'text', nullable: true })
  observations: string;

  @OneToMany(() => SessionExercise, (sessionExercise) => sessionExercise.session, {
    cascade: true,
  })
  exercises: SessionExercise[];

  @OneToMany(() => TreatmentPlan, (plan) => plan.session)
  treatment_plans: TreatmentPlan[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}