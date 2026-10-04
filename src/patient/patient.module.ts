import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { TherapistPatient } from './entities/therapist-patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';
import { Session } from 'src/session/entities/session.entity';
import { PatientsController } from './patient.controller';
import { PatientsService } from './patient.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, TherapistPatient, Therapist, Session]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientModule {}