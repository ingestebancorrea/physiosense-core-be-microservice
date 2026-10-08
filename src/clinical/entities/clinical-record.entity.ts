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
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';

/**
 * Nota del historial cl��nico.
 *
 * El diagn��stico del paciente NO vive acǭ: es una columna de
 * `patient_profiles` (`patient_profiles.diagnosis`) porque la app lo trata
 * como dato de cabecera y lo muestra read-only en la edici��n de perfil.
 */
@Entity('clinical_records')
@Index('idx_clinical_records_patient_date', ['patient_id', 'recorded_at'])
export class ClinicalRecord {
  @PrimaryGeneratedColumn('increment')
  clinical_record_id: number;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => PatientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientProfile;

  // NULL cuando el registro lo carg�� un administrador o qued�� sin autor tras
  // dar de baja al fisioterapeuta. Apunta a physiotherapists.physiotherapist_id
  // (auth) y NO tiene FK: `therapists` no existe en esta base.
  @Column({ type: 'int', nullable: true })
  therapist_id: number;

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