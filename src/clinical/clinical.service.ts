import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  ASSESSMENT_TYPE_LABEL,
  AssessmentType,
  CLINICAL_RECORD_TYPE_LABEL,
} from 'src/common/enum/clinical.enum';
import { PaginatedDto } from 'src/common/dto/pagination.dto';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { PatientsService } from 'src/patient/patient.service';
import { ClinicalRecord } from './entities/clinical-record.entity';
import { ClinicalAssessment } from './entities/clinical-assessment.entity';
import {
  CreateAssessmentDto,
  CreateClinicalRecordDto,
  QueryClinicalRecordsDto,
} from './dto/clinical.dto';
import {
  AssessmentResponseDto,
  ClinicalRecordResponseDto,
} from './dto/clinical-response.dto';

@Injectable()
export class ClinicalService {
  constructor(
    @InjectRepository(ClinicalRecord)
    private readonly recordRepository: Repository<ClinicalRecord>,
    @InjectRepository(ClinicalAssessment)
    private readonly assessmentRepository: Repository<ClinicalAssessment>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    private readonly patientsService: PatientsService,
  ) {}

  async createRecord(
    dto: CreateClinicalRecordDto,
    therapistId: number,
  ): Promise<ClinicalRecordResponseDto> {
    await this.patientsService.assertTherapistOwnsPatient(
      dto.patient_id,
      therapistId,
    );

    const record = await this.recordRepository.save(
      this.recordRepository.create({
        patient_id: dto.patient_id,
        therapist_id: therapistId,
        type: dto.type,
        title: dto.title ?? null,
        description: dto.description,
        document_url: dto.document_url ?? null,
        recorded_at: dto.recorded_at ? new Date(dto.recorded_at) : new Date(),
      }),
    );

    return this.toRecordResponse(record);
  }

  async findRecords(
    patientId: number,
    query: QueryClinicalRecordsDto,
  ): Promise<PaginatedDto<ClinicalRecordResponseDto>> {
    await this.assertPatientExists(patientId);

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .where('record.patient_id = :patientId', { patientId });

    if (query.type) {
      qb.andWhere('record.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(record.title) LIKE :search OR LOWER(record.description) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    qb.orderBy('record.recorded_at', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((record) => this.toRecordResponse(record)),
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  async findRecord(
    patientId: number,
    recordId: number,
  ): Promise<ClinicalRecordResponseDto> {
    await this.assertPatientExists(patientId);

    const record = await this.recordRepository.findOne({
      where: { clinical_record_id: recordId, patient_id: patientId },
    });

    if (!record) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }

    return this.toRecordResponse(record);
  }

  /** Las notas clínicas son append-only: se corrigen agregando otra. */
  async removeRecord(patientId: number, recordId: number): Promise<void> {
    await this.assertPatientExists(patientId);

    const result = await this.recordRepository.delete({
      clinical_record_id: recordId,
      patient_id: patientId,
    });

    if (!result.affected) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }
  }

  async createAssessment(
    dto: CreateAssessmentDto,
    therapistId: number,
  ): Promise<AssessmentResponseDto> {
    await this.patientsService.assertTherapistOwnsPatient(
      dto.patient_id,
      therapistId,
    );

    const assessment = await this.assessmentRepository.save(
      this.assessmentRepository.create({
        patient_id: dto.patient_id,
        therapist_id: therapistId,
        type: dto.type ?? AssessmentType.PERIODIC,
        pain_scale: dto.pain_scale ?? null,
        rom_degrees: dto.rom_degrees ?? null,
        strength_newtons: dto.strength_newtons ?? null,
        score: dto.score ?? null,
        notes: dto.notes ?? null,
        is_completed: dto.is_completed ?? true,
        assessed_at: dto.assessed_at ? new Date(dto.assessed_at) : new Date(),
      }),
    );

    return this.toAssessmentResponse(assessment);
  }

  async findAssessments(
    patientId: number,
    includePending = false,
  ): Promise<AssessmentResponseDto[]> {
    await this.assertPatientExists(patientId);

    const qb = this.assessmentRepository
      .createQueryBuilder('assessment')
      .where('assessment.patient_id = :patientId', { patientId });

    // El dashboard del fisioterapeuta cuenta "evaluaciones pendientes", así que
    // por defecto se devuelven las cerradas y las pendientes se piden aparte.
    if (!includePending) {
      qb.andWhere('assessment.is_completed = true');
    }

    qb.orderBy('assessment.assessed_at', 'DESC');

    const rows = await qb.getMany();

    return rows.map((assessment) => this.toAssessmentResponse(assessment));
  }

  /** Contador para el badge "Evaluaciones pendientes" del dashboard. */
  async countPendingAssessments(therapistId: number): Promise<number> {
    return this.assessmentRepository
      .createQueryBuilder('assessment')
      .where('assessment.therapist_id = :therapistId', { therapistId })
      .andWhere('assessment.is_completed = false')
      .getCount();
  }

  async findAssessment(
    patientId: number,
    assessmentId: number,
  ): Promise<AssessmentResponseDto> {
    await this.assertPatientExists(patientId);

    const assessment = await this.assessmentRepository.findOne({
      where: { assessment_id: assessmentId, patient_id: patientId },
    });

    if (!assessment) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }

    return this.toAssessmentResponse(assessment);
  }

  async completeAssessment(
    patientId: number,
    assessmentId: number,
  ): Promise<AssessmentResponseDto> {
    await this.assertPatientExists(patientId);

    const assessment = await this.assessmentRepository.findOne({
      where: { assessment_id: assessmentId, patient_id: patientId },
    });

    if (!assessment) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }

assessment.is_completed = true;
    await this.assessmentRepository.save(assessment);

    return this.toAssessmentResponse(assessment);
  }

  private async assertPatientExists(patientId: number): Promise<void> {
    const patient = await this.patientProfileRepository.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(ErrorMessages.PATIENT_NOT_FOUND);
    }
  }

  private toRecordResponse(record: ClinicalRecord): ClinicalRecordResponseDto {
    return {
      id: record.clinical_record_id,
      patient_id: record.patient_id,
      therapist_id: record.therapist_id,
      type: record.type,
      typeLabel: CLINICAL_RECORD_TYPE_LABEL[record.type] ?? record.type,
      title: record.title,
      description: record.description,
      document_url: record.document_url,
      recordedAt: record.recorded_at,
      createdAt: record.created_at,
    };
  }

  private toAssessmentResponse(
    assessment: ClinicalAssessment,
  ): AssessmentResponseDto {
    return {
      id: assessment.assessment_id,
      patient_id: assessment.patient_id,
      therapist_id: assessment.therapist_id,
      type: assessment.type,
      typeLabel: ASSESSMENT_TYPE_LABEL[assessment.type] ?? assessment.type,
      painScale:
        assessment.pain_scale === null ? null : Number(assessment.pain_scale),
      romDegrees:
        assessment.rom_degrees === null ? null : Number(assessment.rom_degrees),
      strengthNewtons:
        assessment.strength_newtons === null
          ? null
          : Number(assessment.strength_newtons),
      score: assessment.score === null ? null : Number(assessment.score),
      notes: assessment.notes,
      is_completed: assessment.is_completed,
assessedAt: assessment.assessed_at,
    };
  }
}
