import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationCategory } from 'src/common/enum/notification.enum';
import { Patient } from 'src/patient/entities/patient.entity';

/**
 * Notificación dirigida a un usuario.
 *
 * El agrupamiento en 'Hoy' | 'Ayer' | 'Esta semana' que la app muestra en la
 * cabecera NO se persiste: se deriva de `created_at` en el cliente, igual que
 * hoy.
 */
@Entity('notifications')
@Index('idx_notifications_user_read', ['user_id', 'is_read'])
export class Notification {
  @PrimaryGeneratedColumn('increment')
  notification_id: number;

  // `users.id` del microservicio de autenticación.
  @Column({ type: 'int' })
  user_id: number;

  // Presente cuando la notificación es sobre un paciente concreto, para poder
  // filtrar el feed del fisioterapeuta.
  @Column({ type: 'int', nullable: true })
  patient_id: number;

  @ManyToOne(() => Patient, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    enumName: 'notification_category_enum',
    default: NotificationCategory.GENERAL,
  })
  category: NotificationCategory;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'bool', default: false })
  is_read: boolean;

  @Column({ type: 'bool', default: false })
  is_important: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}