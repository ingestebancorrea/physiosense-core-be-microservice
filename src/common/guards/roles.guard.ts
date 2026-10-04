import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileRoleAlias } from '../enum/profile-role.enum';
import { Actor } from '../interfaces/authenticated-user.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Exige que el actor resuelto por `ActorGuard` tenga uno de los roles pedidos.
 *
 * Se aplica siempre despues de `ActorGuard`, que es quien llena request.actor.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ProfileRoleAlias[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const actor: Actor | undefined = request.actor;

    if (!actor || !requiredRoles.includes(actor.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}