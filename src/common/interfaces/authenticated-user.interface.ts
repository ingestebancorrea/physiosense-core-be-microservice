/**
 * Claims que emite authentication-be-microservice en el access token.
 *
 * El token ya incluye el rol (`role_alias`) y los ids de perfil
 * (`patient_id`, `physiotherapist_id`), asi que este microservicio arma el
 * actor directamente desde el token sin volver a llamar a auth por request.
 *
 * Verificado en `JwtAuthGuard` (HS256 + JWT_SECRET).
 */
import { ProfileRoleAlias } from '../enum/profile-role.enum';

export interface AuthenticatedUser {
  /** `users.id` del microservicio de autenticacion. */
  uuid: number;
  username: string;
  name: string;
  /** Rol del perfil. Null si el usuario no tiene perfil de paciente/fisio. */
  role_alias: ProfileRoleAlias | null;
  /** `patients.patient_id` de auth. Null salvo que el rol sea PAC. */
  patient_id: number | null;
  /** `physiotherapists.physiotherapist_id` de auth. Null salvo que sea FIS. */
  physiotherapist_id: number | null;
  is_active: boolean;
}

/** Actor con el rol ya mapeado desde los claims del token. */
export interface Actor {
  uuid: number;
  username: string;
  name: string;
  role: ProfileRoleAlias;
  /** `patients.patient_id` de auth. 0 cuando el actor es fisioterapeuta. */
  patientId: number;
  /** `physiotherapists.physiotherapist_id` de auth. 0 cuando es paciente. */
  therapistId: number;
}
