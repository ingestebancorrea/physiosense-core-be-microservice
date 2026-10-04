import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Session } from './entities/session.entity';
import { SessionExercise } from './entities/session-exercise.entity';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import { RepetitionLog } from 'src/device/entities/repetition-log.entity';
import { DeviceSession } from 'src/device/entities/device-session.entity';
import { SessionsController } from './session.controller';
import { SessionsService } from './session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionExercise,
      TreatmentPlan,
      Patient,
      Therapist,
      Exercise,
      // Se cargan porque `repetition_logs` se consulta al cerrar la sesión.
      RepetitionLog,
      DeviceSession,
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionModule {}