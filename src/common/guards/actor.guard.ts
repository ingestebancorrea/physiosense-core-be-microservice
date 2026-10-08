import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ErrorMessages } from '../enum/error-messages.enum';
import { ProfileRoleAlias } from '../enum/profile-role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import {
  AuthClient,
  AuthUserProfile,
} from '../services/auth-client.service';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';

/**
 * Resuelve el rol del actor y lo deja en `request.actor`.
 *
 * El token de authentication-be-microservice NO incluye el rol (solo
 * { uuid, username, name }), asi que el rol se pide a ese servicio con
 * `GET /users/:id/profile`: si el usuario es PAC ahi esta su `patient_id`, y si
 * es FIS su `physiotherapist_id`. Este modulo ya no tiene tablas
 * `patients`/`therapists` contra las que preguntar.
 *
 * La unica consulta local que queda es `patient_profiles.is_active`: la baja
 * local que hace el fisioterapeuta no debe permitirle al paciente seguir
 * operando, y esa decision es de este servicio.
 *
 * Se responde 403 (no 401) cuando no hay rol: el token es valido, simplemente
 * ese usuario no puede operar sobre el dominio.
 *
 * El chequeo de baja local se hace con `DataSource` (no con `@InjectRepository`):
 * los guards se instancian en el contexto del modulo del controller que los
 * usa, y `TherapistModule` no importa `TypeOrmModule.forFeature`. El `DataSource`
 * en cambio viene del `TypeOrmCoreModule`, que es global.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authClient: AuthClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user?.uuid) {
      request.actor = undefined;
      return true;
    }

    const profile = await this.resolveProfile(user.uuid);

    if (!profile.is_active) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
    }

    if (profile.role_alias === ProfileRoleAlias.PATIENT && profile.patient_id) {
      await assertNotDeactivatedLocally(
        this.dataSource.getRepository(PatientProfile),
        profile.patient_id,
      );

      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PATIENT,
        patientId: profile.patient_id,
        therapistId: 0,
      };
      return true;
    }

    if (
      profile.role_alias === ProfileRoleAlias.PHYSIOTHERAPIST &&
      profile.physiotherapist_id
    ) {
      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PHYSIOTHERAPIST,
        patientId: 0,
        therapistId: profile.physiotherapist_id,
      };
      return true;
    }

    // Cuenta sin perfil de paciente ni de fisioterapeuta.
    throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
  }

  private async resolveProfile(userId: number): Promise<AuthUserProfile> {
    try {
      return await this.authClient.getUserProfile(userId);
    } catch (error) {
      // Usuario que ya no existe en auth: mismo tratamiento que "sin rol".
      // El 503 (auth caido) si se propaga, porque ahi no hay nada que decidir.
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
      }
      throw error;
    }
  }
}

/** La baja local en `patient_profiles` bloquea al paciente. */
async function assertNotDeactivatedLocally(
  repository: Repository<PatientProfile>,
  patientId: number,
): Promise<void> {
  const profile = await repository.findOne({
    where: { patient_id: patientId },
    select: { patient_id: true, is_active: true },
  });

  if (profile && !profile.is_active) {
    throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
  }
}
