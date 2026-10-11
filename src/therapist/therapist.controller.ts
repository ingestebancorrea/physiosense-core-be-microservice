import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
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
import { ProfileRoleAlias } from 'src/common/enum/profile-role.enum';
import { SwaggerMessages } from 'src/common/enum/swagger-messages.enum';
import { Actor } from 'src/common/interfaces/authenticated-user.interface';
import {
  AuthClient,
  AuthTherapistProfile,
} from 'src/common/services/auth-client.service';
import { PatientListResponseDto } from './dto/patient-list-response.dto';
import { TherapistsService } from './therapist.service';

/**
 * Lectura del fisioterapeuta.
 *
 * Este servicio ya no tiene tabla `therapists`: el perfil se trae de
 * authentication-be-microservice en cada request (cacheado 60 s por
 * `AuthClient`). El shape de respuesta se mantiene con `therapist_id` para no
 * romper al cliente movil, que ya usa ese nombre.
 *
 * Los pacientes asignados se leen de lo local (`therapist_patients` +
 * `patient_profiles`) y la identidad se completa por lote con `AuthClient`.
 */
@ApiTags('therapists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)
@Controller('therapists')
export class TherapistsController {
  constructor(
    private readonly authClient: AuthClient,
    private readonly therapistsService: TherapistsService,
  ) {}

  @Get('profile')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({ summary: 'Perfil del fisioterapeuta autenticado' })
  @ApiResponse({ status: 401, description: SwaggerMessages.NOT_VALID_TOKEN })
  @ApiResponse({ status: 403, description: SwaggerMessages.FORBIDDEN_ROLE })
  @ApiResponse({ status: 404, description: SwaggerMessages.THERAPIST_NOT_FOUND })
  @ApiResponse({ status: 503, description: SwaggerMessages.AUTH_SERVICE_UNAVAILABLE })
  async me(@CurrentActor() actor: Actor) {
    const therapist = await this.authClient.getTherapist(actor.therapistId);
    return this.toResponse(therapist);
  }

  @Get('patients')
  @Roles(ProfileRoleAlias.PHYSIOTHERAPIST)
  @ApiOperation({
    summary: 'Pacientes asignados al fisioterapeuta autenticado',
    description:
      'Fusiona la ficha clínica local con la identidad de ' +
      'authentication-be-microservice, que se consulta por lote de ids.',
  })
  @ApiResponse({ status: 200, type: PatientListResponseDto })
  @ApiResponse({ status: 401, description: SwaggerMessages.NOT_VALID_TOKEN })
  @ApiResponse({ status: 403, description: SwaggerMessages.FORBIDDEN_ROLE })
  @ApiResponse({ status: 503, description: SwaggerMessages.AUTH_SERVICE_UNAVAILABLE })
  findMyPatients(@CurrentActor() actor: Actor) {
    return this.therapistsService.getPatientsByTherapist(actor.therapistId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un fisioterapeuta' })
  @ApiResponse({ status: 404, description: SwaggerMessages.THERAPIST_NOT_FOUND })
  @ApiResponse({ status: 503, description: SwaggerMessages.AUTH_SERVICE_UNAVAILABLE })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const therapist = await this.authClient.getTherapist(id);
    return this.toResponse(therapist);
  }

  private toResponse(therapist: AuthTherapistProfile) {
    return {
      therapist_id: therapist.physiotherapist_id,
      user_id: therapist.user_id,
      full_name: therapist.full_name,
      email: therapist.email,
      avatar_url: therapist.avatar_url,
      specialty: therapist.specialty,
      license_number: therapist.license_number,
      institution: therapist.institution,
      years_of_experience: therapist.years_of_experience,
      phone: therapist.phone,
      notes: therapist.notes,
      is_active: therapist.is_active,
    };
  }
}
