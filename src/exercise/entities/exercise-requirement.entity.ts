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
 * Requisito previo de un ejercicio.
 *
 * En la app es un string[]. Se normaliza en tabla propia para poder editarlos
 * de a uno sin pisar el resto.
 */
@Entity('exercise_requirements')
@Unique('uq_exercise_requirements_position', ['exercise_id', 'position'])
export class ExerciseRequirement {
  @PrimaryGeneratedColumn('increment')
  requirement_id: number;

  @Column({ type: 'int' })
  exercise_id: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 255 })
  requirement: string;
}