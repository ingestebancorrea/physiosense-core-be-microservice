import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceStatus } from 'src/common/enum/device.enum';
import { DeviceSession } from './device-session.entity';

/**
 * Guante Smart Glove.
 *
 * La app declara el mismo estado dos veces (`GloveConnectionState` y
 * `DeviceStatus`) y le pone dos nombres distintos ('Smart Glove' en Devices y
 * 'Guante Sense' en Preparation). Acá queda uno solo.
 */
@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('increment')
  device_id: number;

  @Index('idx_devices_serial_number', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  serial_number: string;

  @Column({ type: 'varchar', length: 80, default: 'Smart Glove' })
  name: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  firmware_version: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    enumName: 'device_status_enum',
    default: DeviceStatus.DISCONNECTED,
  })
  status: DeviceStatus;

  // 0-100. La pantalla de dispositivos lo usa para el ancho de la barra.
  @Column({ type: 'int', nullable: true })
  battery_level: number;

  // `users.id` del propietario (auth service).
  @Column({ type: 'int', nullable: true })
  owner_user_id: number;

  @Column({ type: 'int', nullable: true })
  owner_patient_id: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at: Date;

  @OneToMany(() => DeviceSession, (deviceSession) => deviceSession.device)
  sessions: DeviceSession[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}