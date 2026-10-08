import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActorGuard } from './guards/actor.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthClient } from './services/auth-client.service';

/**
 * Guards y filtros compartidos por todos los modulos de dominio.
 *
 * Es @Global para que los controllers no tengan que importar nada extra: los
 * guards se aplican con `@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)`.
 *
 * No hace falta ningun `TypeOrmModule.forFeature` acá: `ActorGuard` consulta
 * `patient_profiles` con el `DataSource` (global) y los modulos de dominio
 * registran los repositorios que usan en sus propios `forFeature`.
 */
@Global()
@Module({
  providers: [JwtAuthGuard, ActorGuard, RolesGuard, AuthClient],
  exports: [JwtAuthGuard, ActorGuard, RolesGuard, AuthClient],
})
export class CommonModule {}
