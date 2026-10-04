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
import { DeviceStatus } from 'src/common/enum/device.enum';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import {
  ConnectDeviceDto,
  DisconnectDeviceDto,
  IngestRepetitionsDto,
  RegisterDeviceDto,
} from './dto/device.dto';
import {
  DeviceResponseDto,
  DeviceSessionResponseDto,
  ExecutionSummaryDto,
  IngestResultDto,
  RepetitionLogResponseDto,
} from './dto/device-response.dto';
import { DeviceService } from './device.service';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  @ApiOperation({ summary: 'Dispositivos del usuario autenticado' })
  @ApiResponse({ type: [DeviceResponseDto] })
  findAll(@CurrentActor() actor: Actor) {
    return this.deviceService.findAll(actor.uuid);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra o re-empareja un Smart Glove',
    description:
      'El emparejamiento es por `serial_number`: registrarlo de nuevo cambia ' +
      'de dueño sin duplicar el dispositivo.',
  })
  @ApiResponse({ status: 201, type: DeviceResponseDto })
  register(@Body() dto: RegisterDeviceDto, @CurrentActor() actor: Actor) {
    return this.deviceService.register(dto, actor.uuid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un dispositivo' })
  @ApiResponse({ type: DeviceResponseDto })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.findOne(id, actor.uuid);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Reporta el estado de conexión del guante' })
  @ApiResponse({ type: DeviceResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: DeviceStatus; battery_level?: number },
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.updateStatus(
      id,
      actor.uuid,
      body.status,
      body.battery_level,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincula el dispositivo' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.deviceService.remove(id, actor.uuid);
  }

  @Post(':id/connect')
  @Roles(ProfileRoleAlias.PATIENT)
  @ApiOperation({
    summary: 'Conecta el guante a una sesión',
    description:
      'Si el dispositivo ya estaba conectado a otra sesión, esa conexión se cierra.',
  })
  @ApiResponse({ status: 201, type: DeviceSessionResponseDto })
  connect(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConnectDeviceDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.connect(id, actor.uuid, dto);
  }

  @Post(':id/disconnect')
  @ApiOperation({ summary: 'Desconecta el guante' })
  @ApiResponse({ status: 201, type: DeviceSessionResponseDto })
  disconnect(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisconnectDeviceDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.disconnect(id, actor.uuid, dto);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Historial de conexiones del dispositivo' })
  @ApiResponse({ type: [DeviceSessionResponseDto] })
  findDeviceSessions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.findDeviceSessions(id, actor.uuid);
  }

  @Post('telemetry')
  @ApiOperation({
    summary: 'Ingesta un lote de repeticiones del guante',
    description:
      'Es idempotente por (ejercicio de sesión, serie, repetición): si el ' +
      'teléfono reintenta, las repetidas se descartan. Recalcula el resumen ' +
      'del ejercicio y lo congela en la sesión.',
  })
  @ApiResponse({ status: 201, type: IngestResultDto })
  ingest(
    @Body() dto: IngestRepetitionsDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.deviceService.ingestRepetitions(actor.uuid, dto);
  }

  @Get('telemetry/:sessionExerciseId')
  @ApiOperation({ summary: 'Repeticiones registradas de un ejercicio' })
  @ApiResponse({ type: [RepetitionLogResponseDto] })
  findRepetitions(
    @Param('sessionExerciseId', ParseIntPipe) sessionExerciseId: number,
  ) {
    return this.deviceService.findRepetitions(sessionExerciseId);
  }

  @Get('telemetry/:sessionExerciseId/summary')
  @ApiOperation({ summary: 'Resumen de la ejecución de un ejercicio' })
  @ApiResponse({ type: ExecutionSummaryDto })
  getSummary(
    @Param('sessionExerciseId', ParseIntPipe) sessionExerciseId: number,
  ) {
    return this.deviceService.getSummary(sessionExerciseId);
  }
}
