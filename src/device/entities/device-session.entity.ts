import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Device } from './device.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { Session } from 'src/session/entities/session.entity';

/**
 * Período durante el cual el guante estuvo conectado.
 *
 * La pantalla de preparación consulta el estado de la conexión antes de dejar
 * empezar la serie, y cada sesión de entrenamiento tiene su propia conexión.
 * `session_id` queda NULL cuando el guante se conectó sin entrar en una sesión
 * (por ejemplo, solo para revisar el estado).
 */
@Entity('device_sessions')
@Index('idx_device_sessions_device_connected', ['device_id', 'connected_at'])
export class DeviceSession {
  @PrimaryGeneratedColumn('increment')
  device_session_id: number;

  @Column({ type: 'int' })
  device_id: number;

  @ManyToOne(() => Device, (device) => device.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'int', nullable: true })
  session_id: number;

  @ManyToOne(() => Session, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  connected_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  disconnected_at: Date;

  @Column({ type: 'int', nullable: true })
  battery_start: number;

  @Column({ type: 'int', nullable: true })
  battery_end: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}