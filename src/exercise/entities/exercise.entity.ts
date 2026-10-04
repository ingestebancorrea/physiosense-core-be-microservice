import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExerciseCategory, ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { ExerciseRequirement } from './exercise-requirement.entity';
import { ExerciseTargetMuscle } from './exercise-target-muscle.entity';
import { ExerciseGuideStep } from './exercise-guide-step.entity';

/**
 * Catálogo de ejercicios.
 *
 * Los cuatro ejercicios que la app tiene quemados (exercise_01..exercise_04)
 * se cargan por `code` en src/database/seeds.
 *
 * `series` y `reps` son SIEMPRE números acá. La app los maneja hoy de tres
 * formas distintas ('3', '3 series', '3 series'/'15 rep.' según la pantalla),
 * y esa decisión de formato corresponde al cliente.
 */
@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('increment')
  exercise_id: number;

  /**
   * Código estable para el cliente. La app ya referencia los ejercicios por
   * estos ids ('exercise_01'), así que se conservan tal cual en vez de exponer
   * el autoincremental de Postgres.
   */
  @Index('idx_exercises_code', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Instrucciones paso a paso de la guía.
   *
   * La app las arma partiendo este texto por '\n' (previewMapper.ts), así que
   * se guarda como un solo bloque y cada línea es un paso.
   */
  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({
    type: 'enum',
    enum: ExerciseCategory,
    enumName: 'exercise_category_enum',
  })
  category: ExerciseCategory;

  @Column({ type: 'int', default: 3 })
  series: number;

  @Column({ type: 'int', default: 15 })
  reps: number;

  /**
   * Si `reps` cuenta repeticiones o segundos.
   *
   * El pool de sesiones de la app usa '20 seg' en el campo de repeticiones para
   * el estiramiento de dedos, mezclando unidades.
   */
  @Column({
    type: 'enum',
    enum: ExerciseMeasureUnit,
    enumName: 'exercise_measure_unit_enum',
    default: ExerciseMeasureUnit.REPETITIONS,
  })
  measure_unit: ExerciseMeasureUnit;

  @Column({ type: 'int', default: 30 })
  rest_seconds: number;

  /**
   * Rango objetivo de flexión, en GRADOS.
   *
   * La app no declara la unidad, pero `ExecutionScreen` compara contra
   * `currentAngle` y el anillo de progreso escala a 120°, así que son grados.
   * Se persisten por separado y no como un string '60-90'.
   */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  target_min_angle: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  target_max_angle: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  video_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_image_url: string;

  // En segundos. La app lo muestra como 'M:SS' (formatVideoDuration).
  @Column({ type: 'int', nullable: true })
  video_duration_seconds: number;

  @Index('idx_exercises_category_active')
  @Column({ type: 'bool', default: true })
  is_active: boolean;

  // `users.id` del fisioterapeuta que lo creó (auth service).
  @Column({ type: 'int', nullable: true })
  created_by_user_id: number;

  @OneToMany(() => ExerciseRequirement, (requirement) => requirement.exercise, {
    cascade: true,
  })
  requirements: ExerciseRequirement[];

  @OneToMany(() => ExerciseTargetMuscle, (target) => target.exercise, {
    cascade: true,
  })
  target_muscles: ExerciseTargetMuscle[];

  @OneToMany(() => ExerciseGuideStep, (step) => step.exercise, { cascade: true })
  guide_steps: ExerciseGuideStep[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}