import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CurrentActor } from 'src/common/decorators/current-user.decorator';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import { IngestRepetitionsDto } from './dto/telemetry.dto';
import {
  ExecutionSummaryDto,
  IngestResultDto,
  RepetitionLogResponseDto,
} from './dto/telemetry-response.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @ApiOperation({
    summary: 'Ingesta un lote de repeticiones del guante',
    description:
      'Es idempotente por (ejercicio de sesión, serie, repetición): si el ' +
      'teléfono reintenta, las repetidas se descartan. Recalcula el resumen ' +
      'del ejercicio y lo congela en la sesión.',
  })
  @ApiResponse({ status: 201, type: IngestResultDto })
  ingest(@Body() dto: IngestRepetitionsDto, @CurrentActor() actor: Actor) {
    return this.telemetryService.ingestRepetitions(actor.uuid, dto);
  }

  @Get(':sessionExerciseId')
  @ApiOperation({ summary: 'Repeticiones registradas de un ejercicio' })
  @ApiResponse({ type: [RepetitionLogResponseDto] })
  findRepetitions(
    @Param('sessionExerciseId', ParseIntPipe) sessionExerciseId: number,
  ) {
    return this.telemetryService.findRepetitions(sessionExerciseId);
  }

  @Get(':sessionExerciseId/summary')
  @ApiOperation({ summary: 'Resumen de la ejecución de un ejercicio' })
  @ApiResponse({ type: ExecutionSummaryDto })
  getSummary(
    @Param('sessionExerciseId', ParseIntPipe) sessionExerciseId: number,
  ) {
    return this.telemetryService.getSummary(sessionExerciseId);
  }
}