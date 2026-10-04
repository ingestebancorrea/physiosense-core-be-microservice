import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { ErrorMessages } from '../enum/error-messages.enum';

export const INTERNAL_SYNC_HEADER = 'x-internal-sync-secret';

/**
 * Autoriza la sincronización auth -> core.
 *
 * `/patients/sync` y `/therapists/sync` no pueden usar `ActorGuard`: el guard
 * resuelve el rol contra `patients`/`therapists`, así que una cuenta que todavía
 * no fue sincronizada a este servicio recibiría 403 y no podría crearse. Eso
 * deja el sistema sin forma de hacer bootstrap: el primer usuario no se puede
 * registrar nunca.
 *
 * Estos endpoints son de servicio a servicio, no de usuario, así que se
 * autentican con un secreto compartido en el header `x-internal-sync-secret`.
 * `JwtAuthGuard` sigue adelante: hace falta un token válido igual, sólo no se
 * exige que el perfil exista en este servicio.
 *
 * El secreto NO va en la URL ni en el body, y se compara en tiempo constante.
 */
@Injectable()
export class InternalSyncGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('INTERNAL_SYNC_SECRET');

    if (!expected) {
      throw new ForbiddenException(
        `${ErrorMessages.FORBIDDEN_ROLE}: INTERNAL_SYNC_SECRET no está configurado`,
      );
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers?.[INTERNAL_SYNC_HEADER];

    if (typeof provided !== 'string' || !this.safeCompare(provided, expected)) {
      throw new UnauthorizedException(ErrorMessages.NOT_VALID_TOKEN);
    }

    return true;
  }

  private safeCompare(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    // timingSafeEqual exige el mismo largo: si no coinciden, no hay nada que
    // comparar en tiempo constante.
    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }
}
