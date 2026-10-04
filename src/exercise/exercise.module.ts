import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from './entities/exercise.entity';
import { ExerciseRequirement } from './entities/exercise-requirement.entity';
import { ExerciseTargetMuscle } from './entities/exercise-target-muscle.entity';
import { ExerciseGuideStep } from './entities/exercise-guide-step.entity';
import { ExercisesController } from './exercise.controller';
import { ExercisesService } from './exercise.service';
import { MediaService } from './media.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      ExerciseRequirement,
      ExerciseTargetMuscle,
      ExerciseGuideStep,
    ]),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService, MediaService],
  exports: [ExercisesService],
})
export class ExerciseModule {}