/**
 * Claims que emite authentication-be-microservice.
 *
 * Ver `AuthService.generateAccesToken`: { uuid, username, name }.
 *
 * Ojo: el token NO trae el rol. Por eso `ActorGuard` pide el perfil a ese
 * servicio (GET /users/:id/profile via `AuthClient`) para saber si el usuario
 * es FIS o PAC y cual es su patient_id / physiotherapist_id.
 */
import { ProfileRoleAlias } from '../enum/profile-role.enum';

export interface AuthenticatedUser {
  /** `users.id` del microservicio de autenticacion. */
  uuid: number;
  username: string;
  name: string;
}

/** Rol del actor ya resuelto contra authentication-be-microservice. */
export interface Actor extends AuthenticatedUser {
  role: ProfileRoleAlias;
  /** `patients.patient_id` de auth. 0 cuando el actor es fisioterapeuta. */
  patientId: number;
  /** `physiotherapists.physiotherapist_id` de auth. 0 cuando es paciente. */
  therapistId: number;
}