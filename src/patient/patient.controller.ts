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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActorGuard } from 'src/common/guards/actor.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentActor } from 'src/common/decorators/current-user.decorator';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import { ForbiddenException } from '@nestjs/common';
import { PatientResponseDto } from './dto/patient-response.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { AssignTherapistDto } from './dto/assign-therapist.dto';
import { PatientsService } from './patient.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({
    summary: 'Crea la ficha clinica local de un paciente',
    description:
      'El paciente debe existir ya en authentication-be-microservice: aca solo ' +
      'se recibe su patient_id y los campos clinicos (diagnostico, scores, notas).',
  })
  @ApiResponse({ status: 201, type: PatientResponseDto })
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista pacientes',
    description:
      'Un PAC ve únicamente su propia ficha. Un FIS ve todos los pacientes y usa GET /patients/mine para los suyos.',
  })
  findAll(@Query() query: QueryPatientsDto, @CurrentActor() actor: Actor) {
    if (actor.role === ProfileRoleAlias.PATIENT) {
      return this.patientsService.findOwnPatient(actor.patientId);
    }

    return this.patientsService.findAll(query);
  }

  @Get('mine')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Pacientes asignados al fisioterapeuta autenticado' })
  findMine(@Query() query: QueryPatientsDto, @CurrentActor() actor: Actor) {
    return this.patientsService.findByTherapist(actor.therapistId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    if (actor.role === ProfileRoleAlias.PATIENT) {
      if (actor.patientId !== id) {
        throw new ForbiddenException(ErrorMessages.PATIENT_NOT_ASSIGNED);
      }
      return this.patientsService.findOne(actor.patientId);
    }

    await this.assertCanAccess(actor, id);
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Actualiza parcialmente la ficha clínica' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.assertCanAccess(actor, id);
    return this.patientsService.update(id, updatePatientDto);
  }

  @Put(':id/therapist')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Asigna el fisioterapeuta a cargo del paciente' })
  assignTherapist(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignTherapistDto: AssignTherapistDto,
  ) {
    return this.patientsService.assignTherapist(id, assignTherapistDto);
  }

  @Get(':id/therapist')
  @ApiOperation({ summary: 'Fisioterapeutas del paciente' })
  listAssignments(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.listAssignments(id);
  }

  @Put(':id/deactivate')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({
    summary: 'Marca el paciente como inactivo',
    description:
      'No borra nada: el historial clínico y de progreso debe conservarse para auditoría.',
  })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.deactivate(id);
  }

  @Put(':id/activate')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Reactiva un paciente dado de baja' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.activate(id);
  }

  @Delete(':id')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina la ficha clínica (uso administrativo)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.remove(id);
  }

  /** Un paciente sólo puede consultarse a sí mismo. */
  private async assertCanAccess(actor: Actor, patientId: number): Promise<void> {
    if (actor.role !== ProfileRoleAlias.PHYSIOTHERAPIST) return;

    await this.patientsService.assertTherapistOwnsPatient(patientId, actor.therapistId);
  }
}