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
import { ProgressPeriod } from 'src/common/enum/progress.enum';
import { Patient } from 'src/patient/entities/patient.entity';

/**
 * Fotografía agregada del progreso de un paciente en una ventana temporal.
 *
 * Cubre los tres gráficos de la pantalla de progreso con un solo hecho:
 *
 *   - `MotionChartPoint`  -> `avg_rom_degrees` / `max_rom_degrees`
 *   - `ProgressMetric`    -> `total_repetitions`, `total_minutes`
 *                             (+ `*_delta_pct` para el '+12%')
 *   - `CompletedSessionPoint` -> `completed_sessions`
 *
 * `period_start` + `period_end` reemplazan al campo `day` sobrecargado de la
 * app (que era nombre de día, hora, número de semana o trimestre según el
 * periodo). La etiqueta la arma el cliente.
 */
@Entity('progress_snapshots')
@Unique('uq_progress_snapshots_bucket', ['patient_id', 'period', 'period_start'])
@Index('idx_progress_snapshots_patient_period', ['patient_id', 'period', 'period_start'])
export class ProgressSnapshot {
  @PrimaryGeneratedColumn('increment')
  snapshot_id: number;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({
    type: 'enum',
    enum: ProgressPeriod,
    enumName: 'progress_period_enum',
  })
  period: ProgressPeriod;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  @Column({ type: 'int', default: 0 })
  total_repetitions: number;

  @Column({ type: 'int', default: 0 })
  total_minutes: number;

  // Variación porcentual contra la ventana anterior. La app lo muestra como
  // '+12%' y siempre en positivo; acá el signo se conserva.
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  repetitions_delta_pct: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  minutes_delta_pct: number;

  // Rango de movimiento en GRADOS (no el score 0-100 de patients.rom_score).
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  avg_rom_degrees: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  max_rom_degrees: number;

  @Column({ type: 'int', default: 0 })
  completed_sessions: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  compliance_percentage: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}