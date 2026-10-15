import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';
import { PatientModule } from 'src/patient/patient.module';
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
 *
 * Se importa `PatientModule` para poder actualizar la ficha clínica de un
 * paciente asignado al fisioterapeuta autenticado.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TherapistPatient, PatientProfile]),
    PatientModule,
  ],
  controllers: [TherapistsController],
  providers: [TherapistsService],
})
export class TherapistModule {}
