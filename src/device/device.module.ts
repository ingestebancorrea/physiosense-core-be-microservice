import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';
import { Session } from 'src/session/entities/session.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Device } from './entities/device.entity';
import { DeviceSession } from './entities/device-session.entity';
import { RepetitionLog } from './entities/repetition-log.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      DeviceSession,
      RepetitionLog,
      Session,
      SessionExercise,
      Exercise,
      Patient,
      Therapist,
    ]),
  ],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}