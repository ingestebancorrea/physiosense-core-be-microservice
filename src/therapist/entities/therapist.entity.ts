import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';

/**
 * Read-model del fisioterapeuta dentro de este servicio.
 *
 * El perfil profesional real vive en authentication-be-microservice (tabla
 * `physiotherapists`). Acá se guarda una copia mínima para poder:
 *
 *   1. resolver el rol del actor, porque el JWT sólo trae { uuid, username, name }
 *      y ningún claim de rol;
 *   2.-mostrar el nombre del terapeuta en las tarjetas sin llamar al otro
 *      servicio en cada request.
 *
 * Se sincroniza por `user_id` con POST /api/v1/therapists/sync.
 */
@Entity('therapists')
export class Therapist {
  @PrimaryGeneratedColumn('increment')
  therapist_id: number;

  @Index('idx_therapists_user_id', { unique: true })
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 120 })
  full_name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  specialty: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  license_number: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  institution: string;

  @Column({ type: 'int', nullable: true })
  years_of_experience: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @OneToMany(() => TherapistPatient, (assignment) => assignment.therapist)
  patient_assignments: TherapistPatient[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}