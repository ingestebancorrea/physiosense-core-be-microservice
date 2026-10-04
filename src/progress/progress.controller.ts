import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { ProgressPeriod } from 'src/common/enum/progress.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import { PatientsService } from 'src/patient/patient.service';
import {
  CreateProgressSnapshotDto,
  ProgressWindowDto,
  QueryProgressDto,
  SessionDetailProgressDto,
  SessionRecordDto,
} from './dto/progress.dto';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('progress')
export class ProgressController {
  constructor(
    private readonly progressService: ProgressService,
    private readonly patientsService: PatientsService,
  ) {}

  @Get(':patientId')
  @ApiOperation({
    summary: 'Ventana de progreso para los gráficos',
    description:
      'Devuelve `motionPoints`, `metrics` y `completedSessions` con el formato ' +
      'que ya consume `ProgressScreen`.',
  })
  @ApiResponse({ type: ProgressWindowDto })
  async findWindow(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: QueryProgressDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.getWindow(patientId, query);
  }

  @Get(':patientId/windows')
  @ApiOperation({ summary: 'Varias ventanas, para el carrusel de la app' })
  @ApiResponse({ type: [ProgressWindowDto] })
  async findWindows(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: QueryProgressDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.getWindows(patientId, query);
  }

  @Get(':patientId/records')
  @ApiOperation({ summary: 'Historial de sesiones del paciente' })
  @ApiResponse({ type: [SessionRecordDto] })
  async findRecords(
    @Param('patientId', ParseIntPipe) patientId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.findRecords(patientId);
  }

  @Get(':patientId/sessions/:sessionId')
  @ApiOperation({ summary: 'Detalle de una sesión para la pantalla de progreso' })
  @ApiResponse({ type: SessionDetailProgressDto })
  async findSessionDetail(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.findSessionDetail(patientId, sessionId);
  }

  @Get(':patientId/snapshots')
  @ApiOperation({ summary: 'Snapshots agregados persistidos' })
  async findSnapshots(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: QueryProgressDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.findSnapshots(
      patientId,
      query.period ?? ProgressPeriod.WEEK,
    );
  }

  @Post(':patientId/snapshots')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({
    summary: 'Materializa el snapshot de la ventana actual',
    description:
      'Los gráficos se calculan en vivo; el snapshot queda para tendencia y auditoría.',
  })
  async createSnapshot(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: CreateProgressSnapshotDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanRead(actor, patientId);

    return this.progressService.materializeSnapshot(patientId, dto.period);
  }

  /**
   * Un paciente sólo lee su propio progreso; un fisioterapeuta, sólo el de sus
   * pacientes asignados. Se reutiliza la misma regla que en `/patients`.
   */
  private async assertCanRead(actor: Actor, patientId: number): Promise<void> {
    if (actor.role === ProfileRoleAlias.PATIENT) {
      if (actor.patientId !== patientId) {
        throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
      }

      return;
    }

    await this.patientsService.assertTherapistOwnsPatient(
      patientId,
      actor.therapistId,
    );
  }
}
