import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor, AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Claims del token, sin resolver el rol. Solo lo que viene en el JWT.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Actor con el rol ya resuelto contra las tablas de este servicio.
 *
 * `request.actor` lo arma `ActorGuard`, así que el endpoint tiene que declararlo.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest();
    return request.actor;
  },
);