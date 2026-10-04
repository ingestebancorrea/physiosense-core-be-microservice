import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ActorGuard } from 'src/common/guards/actor.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { InternalSyncGuard } from 'src/common/guards/internal-sync.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentActor } from 'src/common/decorators/current-user.decorator';
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import { Therapist } from './entities/therapist.entity';
import { SyncTherapistDto } from './dto/sync-therapist.dto';

@ApiTags('therapists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('therapists')
export class TherapistsController {
  constructor(
    @InjectRepository(Therapist)
    private readonly therapistRepository: Repository<Therapist>,
  ) {}

  /**
   * Upsert por `user_id`.
   *
   * Lo invoca authentication-be-microservice al registrarse o editar un
   * fisioterapeuta. No usa `ActorGuard` a propósito: el usuario todavía no está
   * en `therapists`, así que con ActorGuard el primer fisioterapeuta no podría
   * ever registrarse. En su lugar se valida el secreto de sincronización
   * (`InternalSyncGuard`), porque es un endpoint de servicio a servicio.
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard, InternalSyncGuard)
  @ApiOperation({
    summary: 'Sincroniza el read-model del fisioterapeuta',
    description:
      'Endpoint interno. Requiere el header `x-internal-sync-secret` con el ' +
      'mismo valor que INTERNAL_SYNC_SECRET.',
  })
  async sync(@Body() dto: SyncTherapistDto): Promise<Therapist> {
    const existing = await this.therapistRepository.findOne({
      where: { user_id: dto.user_id },
    });

    if (existing) {
      Object.assign(existing, dto);
      return this.therapistRepository.save(existing);
    }

    return this.therapistRepository.save(this.therapistRepository.create(dto));
  }

  @Get('me')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Perfil del fisioterapeuta autenticado' })
  async me(@CurrentActor() actor: Actor): Promise<Therapist> {
    const therapist = await this.therapistRepository.findOne({
      where: { therapist_id: actor.therapistId },
    });

    if (!therapist) {
      throw new NotFoundException(ErrorMessages.THERAPIST_NOT_FOUND);
    }

    return therapist;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un fisioterapeuta' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Therapist> {
    const therapist = await this.therapistRepository.findOne({
      where: { therapist_id: id },
    });

    if (!therapist) {
      throw new NotFoundException(ErrorMessages.THERAPIST_NOT_FOUND);
    }

    return therapist;
  }
}