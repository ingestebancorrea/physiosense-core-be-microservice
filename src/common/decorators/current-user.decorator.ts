import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor, AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Claims del token tal cual vienen en el JWT
 * (`uuid`, `username`, `name`, `role_alias`, `patient_id`, ...).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Actor con el rol e ids ya mapeados desde los claims del token.
 *
 * `request.actor` lo arma `ActorGuard`, así que el endpoint tiene que declararlo.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest();
    return request.actor;
  },
);