import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QualityLevel } from 'src/common/enum/execution.enum';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { Session } from 'src/session/entities/session.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';

/**
 * Una repetición registrada por el guante.
 *
 * La app toma una muestra cada 60 ms (`TICK_MS` en ExecutionScreen) y calcula
 * fuerza media y calidad predominante al terminar. Guardar cada muestra sería
 * ~16 filas por segundo, así que el backend recibe el agregado por repetición y
 * lo guarda así.
 *
 * El agregado conserva lo que la app necesita: ángulo (para el anillo de
 * progreso), fuerza en newtons y la calidad clasificada. `is_in_target_range`
 * se persiste porque la calidad es un umbral y no alcanza para reconstruir si
 * la repetición entró en la banda.
 */
@Entity('repetition_logs')
@Unique('uq_repetition_logs_coordinates', [
  'session_exercise_id',
  'series_number',
  'repetition_number',
])
@Index('idx_repetition_logs_session', ['session_id'])
@Index('idx_repetition_logs_patient_completed', ['patient_id', 'completed_at'])
export class RepetitionLog {
  @PrimaryGeneratedColumn('increment')
  repetition_log_id: number;

  @Column({ type: 'int' })
  session_id: number;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'int' })
  session_exercise_id: number;

  @ManyToOne(() => SessionExercise, (sessionExercise) => sessionExercise.repetition_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_exercise_id' })
  session_exercise: SessionExercise;

  @Column({ type: 'int' })
  exercise_id: number;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  patient_id: number;

  @ManyToOne(() => PatientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: PatientProfile;

  @Column({ type: 'int' })
  series_number: number;

  @Column({ type: 'int' })
  repetition_number: number;

  // Ángulos en GRADOS.
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  min_angle_degrees: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  avg_angle_degrees: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  max_angle_degrees: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  avg_force_newtons: number;

  @Column({
    type: 'enum',
    enum: QualityLevel,
    enumName: 'execution_quality_enum',
  })
  quality: QualityLevel;

  @Column({ type: 'bool', default: false })
  is_in_target_range: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  completed_at: Date;
}