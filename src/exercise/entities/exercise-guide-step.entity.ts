import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Exercise } from './exercise.entity';

/**
 * Paso de la guía de ejecución (`ExerciseGuideStep` en la app).
 *
 * Se genera a partir de `exercises.instructions`, pero se materializa para
 * poder asociarle una imagen y editarlo sin reparsear texto libre.
 */
@Entity('exercise_guide_steps')
@Unique('uq_exercise_guide_steps_position', ['exercise_id', 'position'])
export class ExerciseGuideStep {
  @PrimaryGeneratedColumn('increment')
  guide_step_id: number;

  @Column({ type: 'int' })
  exercise_id: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.guide_steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string;
}