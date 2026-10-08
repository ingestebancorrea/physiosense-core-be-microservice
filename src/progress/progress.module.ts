import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientModule } from 'src/patient/patient.module';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { Session } from 'src/session/entities/session.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { RepetitionLog } from 'src/telemetry/entities/repetition-log.entity';
import { ProgressSnapshot } from './entities/progress-snapshot.entity';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressSnapshot,
      Session,
      SessionExercise,
      RepetitionLog,
      PatientProfile,
    ]),
    // Se reutiliza `assertTherapistOwnsPatient` en vez de duplicar la regla
    // de "sólo mis pacientes".
    PatientModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}