import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientModule } from 'src/patient/patient.module';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { ClinicalRecord } from './entities/clinical-record.entity';
import { ClinicalAssessment } from './entities/clinical-assessment.entity';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicalRecord,
      ClinicalAssessment,
      PatientProfile,
    ]),
    // Reutiliza `assertTherapistOwnsPatient` para no duplicar la regla.
    PatientModule,
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService],
  exports: [ClinicalService],
})
export class ClinicalModule {}