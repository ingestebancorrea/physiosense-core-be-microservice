import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProfile } from './entities/patient-profile.entity';
import { TherapistPatient } from './entities/therapist-patient.entity';
import { Session } from 'src/session/entities/session.entity';
import { PatientsController } from './patient.controller';
import { PatientsService } from './patient.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientProfile, TherapistPatient, Session]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientModule {}