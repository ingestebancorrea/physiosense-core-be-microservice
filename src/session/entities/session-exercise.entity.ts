import { QualityLevel } from 'src/common/enum/execution.enum';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Session } from './session.entity';
import { RepetitionLog } from 'src/device/entities/repetition-log.entity';

/**
 * Ejercicio asignado dentro de una sesión.
 *
 * Es la tabla que antes no existía: la app guardaba el listado de ejercicios
 * embebido en el mock de sesión y no había forma de saber a qué ejercicio
 * pertenecía cada serie de telemetría.
 *
 * `series` y `reps` son laoverride por sesión: el paciente puede hacer menos de
 * lo que el catálogo prescribe. Siempre numéricos.
 */
@Entity('session_exercises')
@Unique('uq_session_exercises_position', ['session_id', 'position'])
@Unique('uq_session_exercises_exercise', ['session_id', 'exercise_id'])
export class SessionExercise {
  @PrimaryGeneratedColumn('increment')
  session_exercise_id: number;

  @Index('idx_session_exercises_session')
  @Column({ type: 'int' })
  session_id: number;

  @ManyToOne(() => Session, (session) => session.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'int' })
  exercise_id: number;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'int' })
  series: number;

  @Column({ type: 'int' })
  reps: number;

  @Column({
    type: 'enum',
    enum: ExerciseMeasureUnit,
    enumName: 'exercise_measure_unit_enum',
    default: ExerciseMeasureUnit.REPETITIONS,
  })
  measure_unit: ExerciseMeasureUnit;

  @Column({ type: 'int', default: 0 })
  completed_repetitions: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  progress_percentage: number;

  // Agregados de las repeticiones registradas por el guante.
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  avg_force_newtons: number;

  // Calidad predominante, la que más se repitió en la ejecución
  // (`SeriesSummaryData.averageQuality`).
  @Column({
    type: 'enum',
    enum: QualityLevel,
    enumName: 'execution_quality_enum',
    nullable: true,
  })
  dominant_quality: QualityLevel;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => RepetitionLog, (log) => log.session_exercise, { cascade: true })
  repetition_logs: RepetitionLog[];

  /** series * reps, salvo que la unidad sea segundos. */
  get target_repetitions(): number {
    return this.series * this.reps;
  }
}