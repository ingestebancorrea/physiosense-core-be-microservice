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
import { AssessmentType } from 'src/common/enum/clinical.enum';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Evaluación clínica estructurada.
 *
 * Entidad propia y no un `type` de ClinicalRecord porque la app la trata como
 * un elemento de primer nivel: `PatientDetailScreen` tiene la pestaña
 * "Evaluaciones" y el dashboard del fisioterapeuta cuenta "Evaluaciones
 * pendientes".
 */
@Entity('clinical_assessments')
@Index('idx_clinical_assessments_patient_date', ['patient_id', 'assessed_at'])
export class ClinicalAssessment {
  @PrimaryGeneratedColumn('increment')
  assessment_id: number;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'int' })
  therapist_id: number;

  @ManyToOne(() => Therapist, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'therapist_id' })
  therapist: Therapist;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    enumName: 'assessment_type_enum',
    default: AssessmentType.PERIODIC,
  })
  type: AssessmentType;

  // Escala clínica de 0 a 10.
  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  pain_scale: number;

  // Rango de movilidad en GRADOS.
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  rom_degrees: number;

  // Fuerza en newtons, promedio de la evaluación.
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  strength_newtons: number;

  // Puntaje global 0-100, para ordenar y comparar evaluaciones.
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // false = evaluacion agendada pero todavía no completada.
  @Column({ type: 'bool', default: true })
  is_completed: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  assessed_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}