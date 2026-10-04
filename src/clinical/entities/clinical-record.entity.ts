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
import { ClinicalRecordType } from 'src/common/enum/clinical.enum';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Nota del historial clínico.
 *
 * El diagnóstico del paciente NO vive acá: es una columna de `patients`
 * (`patients.diagnosis`) porque la app lo trata como dato de cabecera y lo
 * muestra read-only en la edición de perfil.
 */
@Entity('clinical_records')
@Index('idx_clinical_records_patient_date', ['patient_id', 'recorded_at'])
export class ClinicalRecord {
  @PrimaryGeneratedColumn('increment')
  clinical_record_id: number;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  // NULL cuando el registro lo cargó un administrador o quedó sin autor tras
  // dar de baja al fisioterapeuta.
  @Column({ type: 'int', nullable: true })
  therapist_id: number;

  @ManyToOne(() => Therapist, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'therapist_id' })
  therapist: Therapist;

  @Column({
    type: 'enum',
    enum: ClinicalRecordType,
    enumName: 'clinical_record_type_enum',
  })
  type: ClinicalRecordType;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  document_url: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  recorded_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}