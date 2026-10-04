/**
 * Claims que emite authentication-be-microservice.
 *
 * Ver `AuthService.generateAccesToken`: { uuid, username, name }.
 *
 * Ojo: el token NO trae el rol. Por eso el rol se resuelve contra las tablas
 * de este servicio (patients.user_id / therapists.user_id) en `ActorGuard`.
 */
import { ProfileRoleAlias } from '../enum/profile-role.enum';

export interface AuthenticatedUser {
  /** `users.id` del microservicio de autenticacion. */
  uuid: number;
  username: string;
  name: string;
}

/** Rol del actor ya resuelto contra las tablas de este servicio. */
export interface Actor extends AuthenticatedUser {
  role: ProfileRoleAlias;
  /** patient_id en este servicio. 0 cuando el actor es fisioterapeuta. */
  patientId: number;
  /** therapist_id en este servicio. 0 cuando el actor es paciente. */
  therapistId: number;
}