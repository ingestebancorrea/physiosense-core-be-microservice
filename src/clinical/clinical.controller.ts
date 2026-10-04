import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActorGuard } from 'src/common/guards/actor.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentActor } from 'src/common/decorators/current-user.decorator';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { ForbiddenException } from '@nestjs/common';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import { PatientsService } from 'src/patient/patient.service';
import {
  CreateAssessmentDto,
  CreateClinicalRecordDto,
  CreateNotificationDto,
  QueryClinicalRecordsDto,
  QueryNotificationsDto,
} from './dto/clinical.dto';
import {
  AssessmentResponseDto,
  ClinicalRecordResponseDto,
  NotificationResponseDto,
} from './dto/clinical-response.dto';
import { ClinicalService } from './clinical.service';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller()
export class ClinicalController {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly patientsService: PatientsService,
  ) {}

  // ---------------------------------------------------------------- records

  @Get('patients/:patientId/records')
  @ApiOperation({ summary: 'Historial clínico del paciente' })
  async findRecords(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: QueryClinicalRecordsDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.findRecords(patientId, query);
  }

  @Get('patients/:patientId/records/:recordId')
  @ApiOperation({ summary: 'Detalle de una nota clínica' })
  @ApiResponse({ type: ClinicalRecordResponseDto })
  async findRecord(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.findRecord(patientId, recordId);
  }

  @Post('patients/:patientId/records')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Agrega una nota al historial clínico' })
  @ApiResponse({ status: 201, type: ClinicalRecordResponseDto })
  createRecord(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: Omit<CreateClinicalRecordDto, 'patient_id'>,
    @CurrentActor() actor: Actor,
  ) {
    return this.clinicalService.createRecord(
      { ...dto, patient_id: patientId },
      actor.therapistId,
    );
  }

  @Delete('patients/:patientId/records/:recordId')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una nota clínica' })
  async removeRecord(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('recordId', ParseIntPipe) recordId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.removeRecord(patientId, recordId);
  }

  // ------------------------------------------------------------ assessments

  @Get('patients/:patientId/assessments')
  @ApiOperation({
    summary: 'Evaluaciones del paciente',
    description:
      'Por defecto sólo las completadas; `include_pending=true` trae también ' +
      'las que el fisioterapeuta tiene pendientes de responder.',
  })
  @ApiQuery({ name: 'include_pending', required: false, type: Boolean })
  @ApiResponse({ type: [AssessmentResponseDto] })
  async findAssessments(
    @Param('patientId', ParseIntPipe) patientId: number,
    // `ParseBoolPipe` no admite `optional` en Nest 9, así que el flag se
    // normaliza a mano.
    @Query('include_pending') includePending: string,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.findAssessments(
      patientId,
      includePending === 'true' || includePending === '1',
    );
  }

  @Get('assessments/pending')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Contador de evaluaciones pendientes' })
  countPending(@CurrentActor() actor: Actor) {
    return this.clinicalService.countPendingAssessments(actor.therapistId);
  }

  @Get('patients/:patientId/assessments/:assessmentId')
  @ApiOperation({ summary: 'Detalle de una evaluación' })
  @ApiResponse({ type: AssessmentResponseDto })
  async findAssessment(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.findAssessment(patientId, assessmentId);
  }

  @Post('patients/:patientId/assessments')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Registra una evaluación clínica' })
  @ApiResponse({ status: 201, type: AssessmentResponseDto })
  createAssessment(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: Omit<CreateAssessmentDto, 'patient_id'>,
    @CurrentActor() actor: Actor,
  ) {
    return this.clinicalService.createAssessment(
      { ...dto, patient_id: patientId },
      actor.therapistId,
    );
  }

  @Patch('patients/:patientId/assessments/:assessmentId/complete')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Marca la evaluación como completada' })
  @ApiResponse({ type: AssessmentResponseDto })
  async completeAssessment(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.clinicalService.completeAssessment(patientId, assessmentId);
  }

  // ---------------------------------------------------------- notifications

  @Get('notifications')
  @ApiOperation({ summary: 'Notificaciones del usuario autenticado' })
  findNotifications(
    @Query() query: QueryNotificationsDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.clinicalService.findNotifications(actor.uuid, query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({
    summary: 'Cantidad de no leídas',
    description: 'Es lo que muestra el badge del dashboard.',
  })
  countUnread(@CurrentActor() actor: Actor) {
    return this.clinicalService.countUnread(actor.uuid);
  }

  @Post('notifications')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Emite una notificación' })
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.clinicalService.createNotification(dto);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marca una notificación como leída' })
  @ApiResponse({ type: NotificationResponseDto })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.clinicalService.markAsRead(actor.uuid, id);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Marca todas las notificaciones como leídas' })
  markAllAsRead(@CurrentActor() actor: Actor) {
    return this.clinicalService.markAllAsRead(actor.uuid);
  }

  /**
   * Un paciente sólo lee su propia ficha clínica; un fisioterapeuta, sólo la de
   * sus pacientes asignados. Se aplica sobre el `patient_id` de la ruta.
   */
  private async assertCanRead(actor: Actor, patientId: number): Promise<void> {
    if (actor.role === ProfileRoleAlias.PATIENT) {
      if (actor.patientId !== patientId) {
        throw new ForbiddenException(ErrorMessages.PATIENT_NOT_ASSIGNED);
      }

      return;
    }

    await this.patientsService.assertTherapistOwnsPatient(
      patientId,
      actor.therapistId,
    );
  }
}
