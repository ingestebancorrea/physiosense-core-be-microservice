import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorMessages } from '../enum/error-messages.enum';
import { ProfileRoleAlias } from '../enum/profile-role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Resuelve el rol del actor y lo deja en `request.actor`.
 *
 * El token de authentication-be-microservice NO incluye el rol (solo
 * { uuid, username, name }), así que el rol se determina contra las tablas de
 * este servicio: si el user_id está en `patients` es PAC, si está en
 * `therapists` es FIS.
 *
 * Una cuenta que todavía no fue sincronizada a este servicio no tiene rol: se
 * responde 403 en vez de 401 porque el token sí es válido, simplemente no hay
 * nada que pueda hacer acá.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    @InjectRepository(Patient) private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Therapist) private readonly therapistRepository: Repository<Therapist>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user?.uuid) {
      request.actor = undefined;
      return true;
    }

    const patient = await this.patientRepository.findOne({
      where: { user_id: user.uuid, is_active: true },
      select: { patient_id: true },
    });

    if (patient) {
      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PATIENT,
        patientId: patient.patient_id,
        therapistId: 0,
      };
      return true;
    }

    const therapist = await this.therapistRepository.findOne({
      where: { user_id: user.uuid, is_active: true },
      select: { therapist_id: true },
    });

    if (therapist) {
      request.actor = {
        uuid: user.uuid,
        username: user.username,
        name: user.name,
        role: ProfileRoleAlias.PHYSIOTHERAPIST,
        patientId: 0,
        therapistId: therapist.therapist_id,
      };
      return true;
    }

    // Sin perfil en este servicio el actor no puede operar sobre el dominio.
    throw new ForbiddenException(ErrorMessages.FORBIDDEN_ROLE);
  }
}