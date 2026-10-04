import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from 'src/patient/entities/patient.entity';
import { Session } from './session.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Plan de tratamiento asignado a un paciente.
 *
 * Viene de `AssignSessionScreen`, que hoy arma el payload así:
 *
 *   { patient, session, startDate,
 *     frequency: '3 veces por semana',
 *     planDuration: '4 semanas',
 *     notes }
 *
 * Las unidades vienen embebidas en el texto, así que acá se persisten como
 * enteros y el cliente arma la etiqueta.
 */
@Entity('treatment_plans')
export class TreatmentPlan {
  @PrimaryGeneratedColumn('increment')
  plan_id: number;

  @Index('idx_treatment_plans_patient')
  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'int' })
  therapist_id: number;

  @ManyToOne(() => Therapist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'therapist_id' })
  therapist: Therapist;

  // Opcional: un plan puede agrupar más de una sesión.
  @Column({ type: 'int', nullable: true })
  session_id: number;

  @ManyToOne(() => Session, (session) => session.treatment_plans, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'int', default: 3 })
  frequency_per_week: number;

  @Column({ type: 'int', default: 4 })
  plan_duration_weeks: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}