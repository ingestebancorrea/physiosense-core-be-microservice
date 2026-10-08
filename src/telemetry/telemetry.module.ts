import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { RepetitionLog } from './entities/repetition-log.entity';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [TypeOrmModule.forFeature([RepetitionLog, SessionExercise, Exercise])],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}