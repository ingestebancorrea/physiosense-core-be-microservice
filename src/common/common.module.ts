import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActorGuard } from './guards/actor.guard';
import { RolesGuard } from './guards/roles.guard';
import { InternalSyncGuard } from './guards/internal-sync.guard';
import { Patient } from 'src/patient/entities/patient.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Guards y filtros compartidos por todos los módulos de dominio.
 *
 * Es @Global para que los controllers no tengan que importar nada extra: los
 * guards se aplican con `@UseGuards(JwtAuthGuard, ActorGuard, RolesGuard)`.
 *
 * `TypeOrmModule.forFeature` va acá porque `ActorGuard` resuelve el rol contra
 * `patients`/`therapists`: sin los repositorios registrados en este módulo, la
 * inyección falla al arrancar aunque los módulos de dominio los importen.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Patient, Therapist])],
  providers: [JwtAuthGuard, ActorGuard, RolesGuard, InternalSyncGuard],
  exports: [JwtAuthGuard, ActorGuard, RolesGuard, InternalSyncGuard],
})
export class CommonModule {}