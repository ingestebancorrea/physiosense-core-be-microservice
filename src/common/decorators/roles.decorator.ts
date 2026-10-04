import { SetMetadata } from '@nestjs/common';
import { ProfileRoleAlias } from '../enum/profile-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a ciertos roles.
 *
 * Requiere `ActorGuard` (que llena `request.actor`) antes que `RolesGuard`.
 */
export const Roles = (...roles: ProfileRoleAlias[]) => SetMetadata(ROLES_KEY, roles);