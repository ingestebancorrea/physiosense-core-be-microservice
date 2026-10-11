import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseMessages } from 'src/common/enum/response-messages.enum';
import {
  AuthClient,
  AuthPatientProfile,
} from 'src/common/services/auth-client.service';
import {
  PATIENT_STATUS_LABEL,
  PatientStatus,
} from 'src/patient/entities/patient-profile.entity';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';
import { PatientListItemResponseDto } from './dto/patient-list-item-response.dto';
import { PatientListResponseDto } from './dto/patient-list-response.dto';

/**
 * Lectura de los pacientes de un fisioterapeuta.
 *
 * El fisioterapeuta no es dueño de ninguna tabla de identidad: lo local es la
 * asignación (`therapist_patients`) y la ficha clínica (`patient_profiles`).
 * El nombre, correo, avatar y teléfono se resuelven por lote contra
 * authentication-be-microservice con `AuthClient`, que cachea 60 s.
 *
 * Flujo: una consulta local trae las asignaciones con su ficha clínica, se
 * extraen los `patient_id`, se piden las identidades en una sola llamada y se
 * fusionan en memoria con un `Map` para evitar la búsqueda lineal.
 */
@Injectable()
export class TherapistsService {
  constructor(
    @InjectRepository(TherapistPatient)
    private readonly assignmentRepository: Repository<TherapistPatient>,
    private readonly authClient: AuthClient,
  ) {}

  /** Pacientes asignados al fisioterapeuta, con identidad y ficha clínica. */
  async getPatientsByTherapist(
    therapistId: number,
  ): Promise<PatientListResponseDto> {
    const assignments = await this.assignmentRepository.find({
      where: { therapist_id: therapistId },
      relations: { patient: true },
      order: { is_primary: 'DESC', assigned_at: 'DESC' },
    });

    if (assignments.length === 0) {
      return { message: ResponseMessages.NO_PATIENTS_ASSIGNED, items: [] };
    }

    const patientIds = assignments.map((assignment) => assignment.patient_id);
    const identities = await this.authClient.getPatientsByIds(patientIds);

    return {
      message: null,
      items: assignments.map((assignment) =>
        this.toResponse(assignment, identities.get(assignment.patient_id)),
      ),
    };
  }

  private toResponse(
    assignment: TherapistPatient,
    identity?: AuthPatientProfile,
  ): PatientListItemResponseDto {
    const profile = assignment.patient;
    const status = profile?.status ?? PatientStatus.ACTIVE;

    return {
      id: assignment.patient_id,
      user_id: identity?.user_id ?? null,
      name: identity?.full_name ?? null,
      email: identity?.email ?? null,
      avatarUrl: identity?.avatar_url ?? null,
      age: this.calculateAge(identity?.birth_date),
      birthDate: identity?.birth_date ?? null,
      status,
      statusLabel: PATIENT_STATUS_LABEL[status] ?? status,
      diagnosis: profile?.diagnosis ?? null,
      startDate: profile?.start_date ?? null,
      compliance: this.toScore(profile?.compliance),
      rom: this.toScore(profile?.rom_score),
      strength: this.toScore(profile?.strength_score),
      phone: identity?.phone ?? null,
      dominantHand: identity?.dominant_hand ?? null,
      notes: profile?.notes ?? identity?.notes ?? null,
      is_active: profile?.is_active ?? true,
      is_primary: assignment.is_primary,
      assigned_at: assignment.assigned_at,
    };
  }

  /** Edad en años a partir de `birth_date`; null si falta o es inválida. */
  private calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;

    const born = new Date(`${birthDate}T00:00:00.000Z`);
    if (Number.isNaN(born.getTime())) return null;

    const now = new Date();
    let age = now.getUTCFullYear() - born.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - born.getUTCMonth();

    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) {
      age -= 1;
    }

    return age;
  }

  /** TypeORM devuelve `numeric` como string; lo normaliza a número. */
  private toScore(value?: number | null): number | null {
    return value === undefined || value === null ? null : Number(value);
  }
}
