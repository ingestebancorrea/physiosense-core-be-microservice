import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';
import { TherapistsController } from './therapist.controller';
import { TherapistsService } from './therapist.service';

/**
 * Sin tabla `therapists`: el perfil del fisioterapeuta vive en
 * authentication-be-microservice y se trae por REST con `AuthClient`
 * (registrado en el `CommonModule` global).
 *
 * Se registran `therapist_patients` y `patient_profiles` para resolver la
 * lista de pacientes asignados: la asignación y la ficha clínica son locales,
 * la identidad se completa por lote desde auth.
 */
@Module({
  imports: [TypeOrmModule.forFeature([TherapistPatient, PatientProfile])],
  controllers: [TherapistsController],
  providers: [TherapistsService],
})
export class TherapistModule {}
