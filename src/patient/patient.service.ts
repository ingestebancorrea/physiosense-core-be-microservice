import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  AuthClient,
  AuthPatientProfile,
  AuthTherapistProfile,
} from 'src/common/services/auth-client.service';
import {
  PATIENT_STATUS_LABEL,
  PatientProfile,
  PatientStatus,
} from './entities/patient-profile.entity';
import { TherapistPatient } from './entities/therapist-patient.entity';
import { Session } from 'src/session/entities/session.entity';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import {
  AssignTherapistDto,
  TherapistPatientResponseDto,
} from './dto/assign-therapist.dto';
import { PaginatedDto } from 'src/common/dto/pagination.dto';

/**
 * Pacientes de este servicio = identidad en auth + ficha clinica local.
 *
 * El cruce se hace en memoria: `AuthClient` trae las identidades (cache 60 s)
 * y `patient_profiles` aporta lo clinico. Los filtros (estado, terapeuta,
 * busqueda) y la paginacion se aplican sobre el cruce, porque el filtro por
 * nombre no puede resolverse en SQL sin copiar el nombre a esta base.
 *
 * A escala de clinica el volumen es acotado; si alguna vez no lo fuera, el
 * siguiente paso es paginar del lado de auth en vez de traer todo.
 */
@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(TherapistPatient)
    private readonly assignmentRepository: Repository<TherapistPatient>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly authClient: AuthClient,
  ) {}

  /**
   * Crea la ficha clinica si no existe, sin tocar los campos ya cargados.
   *
   * Es el ancla local de las foreign keys: `sessions`, `clinical_records`,
   * `progress_snapshots`, etc. referencian `patient_profiles.patient_id`, así
   * que todo write del dominio la garantiza antes de insertar.
   */
  async ensureProfile(patientId: number): Promise<void> {
    await this.patientProfileRepository
      .createQueryBuilder()
      .insert()
      .values({ patient_id: patientId })
      .orIgnore()
      .execute();
  }

  /**
   * Crea la ficha clinica de un paciente que ya existe en auth.
   *
   * El `patient_id` es el de autenticacion: este servicio no da de alta
   * identidades, solo recibe la referencia del perfil que ya esta dado de alta
   * alla.
   */
  async create(createPatientDto: CreatePatientDto): Promise<PatientResponseDto> {
    await this.authClient.assertPatient(createPatientDto.patient_id);

    const duplicate = await this.patientProfileRepository.findOne({
      where: { patient_id: createPatientDto.patient_id },
    });

    if (duplicate) {
      throw new ConflictException(ErrorMessages.DUPLICATED_RESOURCE);
    }

    const profile = this.patientProfileRepository.create(createPatientDto);
    await this.patientProfileRepository.save(profile);

    return this.findOne(createPatientDto.patient_id);
  }

  async findAll(query: QueryPatientsDto): Promise<PaginatedDto<PatientResponseDto>> {
    const identities = await this.authClient.getPatients();

    let assignedIds: Set<number> | undefined;
    if (query.therapist_id) {
      const assignments = await this.assignmentRepository.find({
        where: { therapist_id: query.therapist_id },
        select: { patient_id: true },
      });
      assignedIds = new Set(assignments.map((assignment) => assignment.patient_id));
    }

    const profiles = await this.patientProfileRepository.find();
    const profileById = new Map(profiles.map((profile) => [profile.patient_id, profile]));

    const search = query.search?.toLowerCase();

    const matches = identities.filter((identity) => {
      const profile = profileById.get(identity.patient_id);

      if (assignedIds && !assignedIds.has(identity.patient_id)) return false;

      if (
        query.status &&
        (profile?.status ?? PatientStatus.ACTIVE) !== query.status
      ) {
        return false;
      }

      if (search) {
        const byName = identity.full_name.toLowerCase().includes(search);
        const byId = String(identity.patient_id).includes(search);
        if (!byName && !byId) return false;
      }

      return true;
    });

    matches.sort((a, b) => a.full_name.localeCompare(b.full_name));

    const total = matches.length;
    const rows = matches.slice(query.skip, query.skip + query.limit);

    const lastSessions = await this.lastSessionSummaries(
      rows.map((identity) => identity.patient_id),
    );
    const primaryTherapists = await this.primaryTherapistsOf(
      rows.map((identity) => identity.patient_id),
    );

    return {
      items: rows.map((identity) =>
        this.toResponse(
          identity,
          profileById.get(identity.patient_id),
          lastSessions.get(identity.patient_id),
          primaryTherapists.get(identity.patient_id),
        ),
      ),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  /** Ficha del propio paciente, envuelta en el mismo formato de lista. */
  async findOwnPatient(patientId: number) {
    const patient = await this.findOne(patientId);

    return {
      items: [patient],
      total: 1,
      page: 1,
      limit: 1,
      total_pages: 1,
    };
  }

  async findOne(patientId: number): Promise<PatientResponseDto> {
    // Lanza 404 (PATIENT_NOT_FOUND) si el paciente no existe en auth.
    const identity = await this.authClient.getPatient(patientId);

    const profile = await this.patientProfileRepository.findOne({
      where: { patient_id: patientId },
    });

    const lastSessions = await this.lastSessionSummaries([patientId]);
    const primaryTherapists = await this.primaryTherapistsOf([patientId]);

    return this.toResponse(
      identity,
      profile,
      lastSessions.get(patientId),
      primaryTherapists.get(patientId),
    );
  }

  async update(
    patientId: number,
    updatePatientDto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    await this.authClient.assertPatient(patientId);
    await this.ensureProfile(patientId);

    const profile = await this.patientProfileRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!profile) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    Object.assign(profile, updatePatientDto);
    await this.patientProfileRepository.save(profile);

    return this.findOne(patientId);
  }

  /**
   * Borra la ficha clinica local (uso administrativo).
   *
   * El historial clinico y de progreso se van en cascada por las foreign keys
   * del esquema. La cuenta y el perfil en authentication-be-microservice no se
   * tocan: este servicio no es dueno de ellos.
   */
  async remove(patientId: number): Promise<void> {
    const profile = await this.patientProfileRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!profile) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    await this.patientProfileRepository.remove(profile);
  }

  /**
   * Reemplaza el fisioterapeuta a cargo del paciente.
   *
   * Desmarca el `is_primary` de los anteriores en la misma transaccion para
   * que un paciente nunca tenga dos fisioterapeutas principales.
   */
  async assignTherapist(
    patientId: number,
    dto: AssignTherapistDto,
  ): Promise<TherapistPatientResponseDto> {
    await this.authClient.assertPatient(patientId);
    const therapist = await this.authClient.assertTherapist(dto.therapist_id);
    await this.ensureProfile(patientId);

    const saved = await this.assignmentRepository.manager.transaction(
      async (manager) => {
        const assignments = manager.getRepository(TherapistPatient);

        if (dto.is_primary) {
          await assignments.update(
            { patient_id: patientId, is_primary: true },
            { is_primary: false },
          );
        }

        const existing = await assignments.findOne({
          where: { patient_id: patientId, therapist_id: dto.therapist_id },
        });

        if (existing) {
          existing.is_primary = dto.is_primary ?? existing.is_primary;
          if (dto.notes !== undefined) existing.notes = dto.notes;
          return assignments.save(existing);
        }

        return assignments.save(
          assignments.create({
            patient_id: patientId,
            therapist_id: dto.therapist_id,
            is_primary: dto.is_primary ?? false,
            notes: dto.notes ?? null,
          }),
        );
      },
    );

    return this.toAssignmentResponse(saved, therapist.full_name);
  }

  async listAssignments(
    patientId: number,
  ): Promise<TherapistPatientResponseDto[]> {
    const rows = await this.assignmentRepository.find({
      where: { patient_id: patientId },
    });

    const therapists = await this.authClient.getTherapistsByIds(
      rows.map((row) => row.therapist_id),
    );

    return rows.map((row) =>
      this.toAssignmentResponse(
        row,
        therapists.get(row.therapist_id)?.full_name ?? null,
      ),
    );
  }

  /**
   * Verifica que el fisioterapeuta este a cargo del paciente.
   *
   * Se usa antes de crear o editar sesiones y registros clinicos, para que un
   * FIS no pueda tocar la ficha de un paciente que no le corresponde.
   */
  async assertTherapistOwnsPatient(patientId: number, therapistId: number): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { patient_id: patientId, therapist_id: therapistId },
    });

    if (!assignment) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_ASSIGNED);
    }
  }

  /**
   * Verifica que el paciente exista en auth y garantiza su ficha clinica.
   *
   * Es el pre-requisito de todo write del dominio que referencia
   * `patient_profiles` por foreign key.
   */
  async assertPatient(patientId: number): Promise<AuthPatientProfile> {
    const identity = await this.authClient.assertPatient(patientId);
    await this.ensureProfile(patientId);
    return identity;
  }

  /** Edad en anos a partir de `birth_date`. */
  private calculateAge(birthDate?: string): number {
    if (!birthDate) return undefined;

    const born = new Date(`${birthDate}T00:00:00.000Z`);
    if (Number.isNaN(born.getTime())) return undefined;

    const now = new Date();
    let age = now.getUTCFullYear() - born.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - born.getUTCMonth();

    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) {
      age -= 1;
    }

    return age;
  }

  /**
   * Resumen de la ultima sesion de cada paciente: total de ejercicios,
   * ejecutados y timestamp.
   */
  private async lastSessionSummaries(
    patientIds: number[],
  ): Promise<Map<number, Session>> {
    const map = new Map<number, Session>();
    if (patientIds.length === 0) return map;

    const rows = await this.sessionRepository.find({
      where: patientIds.map((id) => ({ patient_id: id })),
      order: { scheduled_at: 'DESC' },
    });

    for (const row of rows) {
      if (!map.has(row.patient_id)) {
        map.set(row.patient_id, row);
      }
    }

    return map;
  }

  /** Fisioterapeuta principal de cada paciente, con su identidad de auth. */
  private async primaryTherapistsOf(
    patientIds: number[],
  ): Promise<Map<number, AuthTherapistProfile>> {
    const map = new Map<number, AuthTherapistProfile>();
    if (patientIds.length === 0) return map;

    const assignments = await this.assignmentRepository.find({
      where: { patient_id: In(patientIds), is_primary: true },
    });

    const therapists = await this.authClient.getTherapistsByIds(
      assignments.map((assignment) => assignment.therapist_id),
    );

    for (const assignment of assignments) {
      const therapist = therapists.get(assignment.therapist_id);
      if (therapist) map.set(assignment.patient_id, therapist);
    }

    return map;
  }

  private toResponse(
    identity: AuthPatientProfile,
    profile: PatientProfile | undefined | null,
    lastSession?: Session,
    primaryTherapist?: AuthTherapistProfile,
  ): PatientResponseDto {
    const status = profile?.status ?? PatientStatus.ACTIVE;

    return {
      id: identity.patient_id,
      user_id: identity.user_id,
      name: identity.full_name,
      email: identity.email,
      avatarUrl: identity.avatar_url,
      age: this.calculateAge(identity.birth_date),
      birthDate: identity.birth_date,
      status,
      statusLabel: PATIENT_STATUS_LABEL[status] ?? status,
      diagnosis: profile?.diagnosis ?? null,
      startDate: profile?.start_date ?? null,
      therapistName: primaryTherapist?.full_name ?? null,
      therapist_id: primaryTherapist?.physiotherapist_id ?? null,
      compliance: profile?.compliance === undefined || profile?.compliance === null
        ? null
        : Number(profile.compliance),
      rom: profile?.rom_score === undefined || profile?.rom_score === null
        ? null
        : Number(profile.rom_score),
      strength: profile?.strength_score === undefined || profile?.strength_score === null
        ? null
        : Number(profile.strength_score),
      phone: identity.phone,
      dominantHand: identity.dominant_hand,
      // Prioriza las notas locales (las del fisioterapeuta); si la ficha todavia
      // no existe cae en las notas que el propio paciente dejo en auth.
      notes: profile?.notes ?? identity.notes ?? null,
      lastSessionAt: lastSession?.scheduled_at ?? null,
      lastSessionTotalExercises: lastSession?.total_exercises ?? null,
      lastSessionCompletedExercises: this.completedExercisesOf(lastSession),
      createdAt: profile?.created_at ?? null,
      updatedAt: profile?.updated_at ?? null,
    };
  }

  private toAssignmentResponse(
    assignment: TherapistPatient,
    therapistName: string | null,
  ): TherapistPatientResponseDto {
    return {
      assignment_id: assignment.assignment_id,
      patient_id: assignment.patient_id,
      therapist_id: assignment.therapist_id,
      therapist_name: therapistName,
      is_primary: assignment.is_primary,
      assigned_at: assignment.assigned_at,
    };
  }

  /** Ejercicios efetivamente completados en la sesion. */
  private completedExercisesOf(session?: Session): number | null {
    if (!session) return null;
    return session.exercises
      ? session.exercises.filter((e) => Number(e.progress_percentage) >= 100).length
      : null;
  }

  /**
   * Marca al paciente como inactivo en vez de borrarlo.
   *
   * El historial clinico y de progreso no se puede eliminar: se usa el
   * deactivate en el controller.
   */
  async deactivate(patientId: number): Promise<PatientResponseDto> {
    await this.setActive(patientId, false);
    return this.findOne(patientId);
  }

  async activate(patientId: number): Promise<PatientResponseDto> {
    await this.setActive(patientId, true);
    return this.findOne(patientId);
  }

  private async setActive(patientId: number, isActive: boolean): Promise<void> {
    await this.authClient.assertPatient(patientId);
    await this.ensureProfile(patientId);

    const profile = await this.patientProfileRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!profile) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    profile.status = isActive ? PatientStatus.ACTIVE : PatientStatus.INACTIVE;
    profile.is_active = isActive;

    await this.patientProfileRepository.save(profile);
  }

  /** Pacientes del fisioterapeuta, para la pantalla "mis pacientes". */
  async findByTherapist(
    therapistId: number,
    query: QueryPatientsDto,
  ): Promise<PaginatedDto<PatientResponseDto>> {
    return this.findAll(Object.assign(new QueryPatientsDto(), query, { therapist_id: therapistId }));
  }

  /** Conta sesiones no cerradas de un paciente; la app lo usa como badge. */
  async countOpenSessions(patientId: number): Promise<number> {
    return this.sessionRepository.count({
      where: {
        patient_id: patientId,
        status: In([SessionStatus.DRAFT, SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]),
      },
    });
  }
}
