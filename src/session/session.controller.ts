import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import {
  CompleteSessionDto,
  CreateSessionDto,
  CreateTreatmentPlanDto,
  QuerySessionsDto,
  UpdateSessionDto,
} from './dto/create-session.dto';
import {
  SessionResponseDto,
  TreatmentPlanResponseDto,
} from './dto/session-response.dto';
import { SessionsService } from './session.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista sesiones',
    description:
      'Un fisioterapeuta ve todas; un paciente ve únicamente las suyas.',
  })
  findAll(@Query() query: QuerySessionsDto, @CurrentActor() actor: Actor) {
    return this.sessionsService.findAll(this.scopeToActor(query, actor));
  }

  @Get('mine')
  @Roles(ProfileRoleAlias.PATIENT)
  @ApiOperation({ summary: 'Sesiones del paciente autenticado' })
  findMine(@Query() query: QuerySessionsDto, @CurrentActor() actor: Actor) {
    return this.sessionsService.findAll({
      ...query,
      patient_id: actor.patientId,
    });
  }

  @Get('plans/:patientId')
  @ApiOperation({ summary: 'Planes de tratamiento de un paciente' })
  @ApiResponse({ type: [TreatmentPlanResponseDto] })
  findPlans(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.sessionsService.findPlans(patientId);
  }

  @Get('plans/:patientId/active')
  @ApiOperation({ summary: 'Plan de tratamiento activo de un paciente' })
  findActivePlan(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.sessionsService.findActivePlan(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una sesión' })
  @ApiResponse({ type: SessionResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    const session = await this.sessionsService.findOne(id);

    // 404 y no 403: un paciente no debe poder confirmar que existe una sesión
    // de otro paciente.
    if (
      actor.role === ProfileRoleAlias.PATIENT &&
      session.patient_id !== actor.patientId
    ) {
      throw new NotFoundException(ErrorMessages.SESSION_NOT_FOUND);
    }

    return session;
  }

  @Post()
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Crea una sesión de tratamiento' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  create(@Body() dto: CreateSessionDto, @CurrentActor() actor: Actor) {
    return this.sessionsService.create(dto, actor.therapistId);
  }

  @Put(':id')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Actualiza una sesión' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(id, dto);
  }

  @Post(':id/start')
  @Roles(ProfileRoleAlias.PATIENT)
  @ApiOperation({
    summary: 'Arranca la ejecución de la sesión',
    description: 'El paciente autenticado es el dueño de la sesión.',
  })
  start(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.sessionsService.start(id, actor.patientId);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Cierra la sesión',
    description:
      'Recalcula repeticiones y progreso desde `repetition_logs`, no desde lo ' +
      'que mande el cliente.',
  })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.sessionsService.complete(id, dto);
  }

  @Patch(':id/cancel')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Cancela la sesión' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.sessionsService.cancel(id);
  }

  @Post('plans')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Crea un plan de tratamiento' })
  @ApiResponse({ status: 201, type: TreatmentPlanResponseDto })
  createPlan(@Body() dto: CreateTreatmentPlanDto, @CurrentActor() actor: Actor) {
    return this.sessionsService.createPlan(dto, actor.therapistId);
  }

  @Patch('plans/:planId/deactivate')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Da de baja un plan de tratamiento' })
  deactivatePlan(@Param('planId', ParseIntPipe) planId: number) {
    return this.sessionsService.deactivatePlan(planId);
  }

  /** El paciente no puede pedir sesiones de otro paciente. */
  private scopeToActor(query: QuerySessionsDto, actor: Actor): QuerySessionsDto {
    if (actor.role !== ProfileRoleAlias.PATIENT) return query;

    return { ...query, patient_id: actor.patientId };
  }
}
