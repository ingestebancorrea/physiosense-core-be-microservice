import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ErrorMessages } from '../enum/error-messages.enum';
import { ProfileRoleAlias } from '../enum/profile-role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';

/**
 * Mapea `request.actor` a partir de los claims del token.
 *
 * El access token de authentication-be-microservice ya trae `role_alias`,
 * `patient_id`, `physiotherapist_id` e `is_active`, asi que este guard NO llama
 * a auth por request: solo lee `request.user`, que dejo `JwtAuthGuard` tras
 * verificar la firma.
 *
 * La unica consulta local que queda es `patient_profiles.is_active`: la baja
 * local que hace el fisioterapeuta no viaja en el token y es decision de este
 * servicio.
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
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user?.uuid) {
      request.actor = undefined;
      return true;
    }

    if (user.is_active === false) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
    }

    if (user.role_alias === ProfileRoleAlias.PATIENT && user.patient_id) {
      await assertNotDeactivatedLocally(
        this.dataSource.getRepository(PatientProfile),
        user.patient_id,
      );

      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PATIENT,
        patientId: user.patient_id,
        therapistId: 0,
      };
      return true;
    }

    if (
      user.role_alias === ProfileRoleAlias.PHYSIOTHERAPIST &&
      user.physiotherapist_id
    ) {
      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PHYSIOTHERAPIST,
        patientId: 0,
        therapistId: user.physiotherapist_id,
      };
      return true;
    }

    // Cuenta sin perfil de paciente ni de fisioterapeuta.
    throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
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
