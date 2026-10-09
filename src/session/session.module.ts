import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Session } from './entities/session.entity';
import { SessionExercise } from './entities/session-exercise.entity';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import { RepetitionLog } from 'src/telemetry/entities/repetition-log.entity';
import { SessionsController } from './session.controller';
import { SessionsService } from './session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionExercise,
      TreatmentPlan,
      PatientProfile,
      Exercise,
      // Se carga porque `repetition_logs` se consulta al cerrar la sesión.
      RepetitionLog,
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionModule {}