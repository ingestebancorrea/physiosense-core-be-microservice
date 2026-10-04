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
 * Músculo objetivo de un ejercicio.
 *
 * NO es un enum cerrado: `CreateExerciseScreen` ofrece 8 sugerencias
 * (MUSCLE_OPTIONS) pero deja agregar muscles a mano, y los datos de detalle
 * usan nombres que no están en esa lista ('Músculos de la eminencia tenar').
 */
@Entity('exercise_target_muscles')
@Unique('uq_exercise_target_muscles_position', ['exercise_id', 'position'])
export class ExerciseTargetMuscle {
  @PrimaryGeneratedColumn('increment')
  target_muscle_id: number;

  @Column({ type: 'int' })
  exercise_id: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.target_muscles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 160 })
  muscle: string;
}