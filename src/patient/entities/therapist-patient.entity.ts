import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Vincula un paciente con un fisioterapeuta.
 *
 * La app hoy no lo tiene: `Patient.therapistName` es un string desnormalizado
 * ('Dr. Esteban Correa') y `PatientProfile.assignedTherapist` es texto libre.
 * Sin esta tabla no se puede responder "mis pacientes" ni autorizar al
 * fisioterapeuta sobre un paciente concreto.
 */
@Entity('therapist_patients')
@Unique('uq_therapist_patients_pair', ['patient_id', 'therapist_id'])
export class TherapistPatient {
  @PrimaryGeneratedColumn('increment')
  assignment_id: number;

  @Index('idx_therapist_patients_patient')
  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, (patient) => patient.therapist_assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Index('idx_therapist_patients_therapist')
  @Column({ type: 'int' })
  therapist_id: number;

  @ManyToOne(() => Therapist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'therapist_id' })
  therapist: Therapist;

  // Un paciente tiene un fisioterapeuta principal; el resto son suplentes.
  @Column({ type: 'bool', default: false })
  is_primary: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  assigned_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}