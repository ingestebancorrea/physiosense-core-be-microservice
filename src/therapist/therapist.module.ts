import { Module } from '@nestjs/common';
import { TherapistsController } from './therapist.controller';

/**
 * Sin `TypeOrmModule.forFeature`: este modulo no tiene entidades. El perfil del
 * fisioterapeuta vive en authentication-be-microservice y se trae por REST con
 * `AuthClient` (registrado en el `CommonModule` global).
 */
@Module({
  controllers: [TherapistsController],
})
export class TherapistModule {}
