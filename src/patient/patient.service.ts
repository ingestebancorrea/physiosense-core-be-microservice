import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import { PATIENT_STATUS_LABEL, Patient, PatientStatus } from './entities/patient.entity';
import { TherapistPatient } from './entities/therapist-patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';
import { Session } from 'src/session/entities/session.entity';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { AssignTherapistDto } from './dto/assign-therapist.dto';
import { PaginatedDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(TherapistPatient)
    private readonly assignmentRepository: Repository<TherapistPatient>,
    @InjectRepository(Therapist) private readonly therapistRepository: Repository<Therapist>,
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Alta idempotente por `user_id`, pensada para que el servicio de
   * autenticación la pueda llamar al registrarse el paciente.
   *
   * Si ya existe devuelve el registro existente en vez de fallar: el
   * `user_id` es único y volver a sincronizar no debe ser un error.
   */
  async sync(createPatientDto: CreatePatientDto): Promise<Patient> {
    const existing = await this.patientRepository.findOne({
      where: { user_id: createPatientDto.user_id },
    });

    if (existing) {
      return this.update(existing.patient_id, createPatientDto);
    }

    const patient = this.patientRepository.create(createPatientDto);
    return this.patientRepository.save(patient);
  }

  async create(createPatientDto: CreatePatientDto): Promise<Patient> {
    const duplicate = await this.patientRepository.findOne({
      where: { user_id: createPatientDto.user_id },
    });

    if (duplicate) {
      throw new ConflictException(ErrorMessages.DUPLICATED_RESOURCE);
    }

    const patient = this.patientRepository.create(createPatientDto);
    return this.patientRepository.save(patient);
  }

  async findAll(query: QueryPatientsDto): Promise<PaginatedDto<PatientResponseDto>> {
    const qb = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect(
        TherapistPatient,
        'tp',
        'tp.patient_id = patient.patient_id AND tp.is_primary = true',
      )
      .leftJoinAndSelect('tp.therapist', 'primary_therapist');

    if (query.status) {
      qb.andWhere('patient.status = :status', { status: query.status });
    }

    if (query.therapist_id) {
      qb.andWhere(
        'patient.patient_id IN (SELECT patient_id FROM therapist_patients WHERE therapist_id = :therapistId)',
        { therapistId: query.therapist_id },
      );
    }

    // La app busca por nombre O por id, en minúsculas.
    if (query.search) {
      qb.andWhere(
        '(LOWER(patient.full_name) LIKE :search OR CAST(patient.patient_id AS TEXT) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    qb.orderBy('patient.full_name', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    // Los aggregates de "última sesión" son una consulta aparte: se piden
    // siempre los mismos y sólo para la página actual.
    const lastSessions = await this.lastSessionSummaries(rows.map((p) => p.patient_id));

    return {
      items: rows.map((patient) =>
        this.toResponse(patient, lastSessions.get(patient.patient_id)),
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
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
      relations: { therapist_assignments: { therapist: true } },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    const primary = patient.therapist_assignments?.find((a) => a.is_primary);
    const lastSessions = await this.lastSessionSummaries([patientId]);

    return this.toResponse(patient, lastSessions.get(patientId), primary?.therapist);
  }

  async update(patientId: number, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    // Defensa en profundidad: `UpdatePatientDto` ya omite `user_id` y el
    // ValidationPipe rechaza la propiedad, pero si alguien reintroduce el campo
    // en el DTO no debe poder re-apuntar el perfil a otra cuenta de auth.
    const { user_id, ...safeData } = updatePatientDto;
    Object.assign(patient, safeData);

    return this.patientRepository.save(patient);
  }

  async remove(patientId: number): Promise<void> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    await this.patientRepository.remove(patient);
  }

  /**
   * Reemplaza el fisioterapeuta a cargo del paciente.
   *
   * Desmarca el `is_primary` de los anteriores en la misma transacción para
   * que un paciente nunca tenga dos fisioterapeutas principales.
   */
  async assignTherapist(
    patientId: number,
    dto: AssignTherapistDto,
  ): Promise<TherapistPatient> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    const therapist = await this.therapistRepository.findOne({
      where: { therapist_id: dto.therapist_id },
    });

    if (!therapist) {
      throw new NotFoundException(ErrorMessages.THERAPIST_NOT_FOUND);
    }

    return this.assignmentRepository.manager.transaction(async (manager) => {
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
    });
  }

  async listAssignments(patientId: number): Promise<TherapistPatient[]> {
    return this.assignmentRepository.find({
      where: { patient_id: patientId },
      relations: { therapist: true },
    });
  }

  /**
   * Verifica que el fisioterapeuta esté a cargo del paciente.
   *
   * Se usa antes de crear o editar sesiones y registros clínicos, para que un
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

  /** Edad en años a partir de `birth_date`. */
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
   * Resumen de la última sesión de cada paciente: total de ejercicios,
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

  private toResponse(
    patient: Patient,
    lastSession?: Session,
    therapist?: Therapist,
  ): PatientResponseDto {
    const primaryTherapist = therapist ?? patient.therapist_assignments?.find((a) => a.is_primary)?.therapist;

    return {
      id: patient.patient_id,
      user_id: patient.user_id,
      name: patient.full_name,
      email: patient.email,
      avatarUrl: patient.avatar_url,
      age: this.calculateAge(patient.birth_date),
      birthDate: patient.birth_date,
      status: patient.status,
      statusLabel: PATIENT_STATUS_LABEL[patient.status] ?? patient.status,
      diagnosis: patient.diagnosis,
      startDate: patient.start_date,
      therapistName: primaryTherapist?.full_name ?? null,
      therapist_id: primaryTherapist?.therapist_id ?? null,
      compliance: patient.compliance === null ? null : Number(patient.compliance),
      rom: patient.rom_score === null ? null : Number(patient.rom_score),
      strength: patient.strength_score === null ? null : Number(patient.strength_score),
      phone: patient.phone,
      dominantHand: patient.dominant_hand,
      notes: patient.notes,
      lastSessionAt: lastSession?.scheduled_at ?? null,
      lastSessionTotalExercises: lastSession?.total_exercises ?? null,
      lastSessionCompletedExercises: this.completedExercisesOf(lastSession),
      createdAt: patient.created_at,
      updatedAt: patient.updated_at,
    };
  }

  /** Ejercicios efetivamente completados en la sesión. */
  private completedExercisesOf(session?: Session): number | null {
    if (!session) return null;
    return session.exercises
      ? session.exercises.filter((e) => Number(e.progress_percentage) >= 100).length
      : null;
  }

  /**
   * Marca al paciente como inactivo en vez de borrarlo.
   *
   * El historial clínico y de progreso no se puede eliminar: se usa el
   * deactivate en el controller.
   */
  async deactivate(patientId: number): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    patient.status = PatientStatus.INACTIVE;
    patient.is_active = false;

    return this.patientRepository.save(patient);
  }

  async activate(patientId: number): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }

    patient.status = PatientStatus.ACTIVE;
    patient.is_active = true;

    return this.patientRepository.save(patient);
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

  assertBirthDate(birthDate: string): void {
    const parsed = new Date(`${birthDate}T00:00:00.000Z`);
    const min = new Date('1900-01-01T00:00:00.000Z');

    if (Number.isNaN(parsed.getTime()) || parsed > new Date() || parsed < min) {
      throw new BadRequestException(ErrorMessages.INVALID_DATE_RANGE);
    }
  }
}