import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalModule } from 'src/clinical/clinical.module';
import { CommonModule } from 'src/common/common.module';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { TelemetryModule } from 'src/telemetry/telemetry.module';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { PatientModule } from 'src/patient/patient.module';
import { ProgressModule } from 'src/progress/progress.module';
import { SessionModule } from 'src/session/session.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { ENTITIES } from 'src/database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: ENTITIES,
        // El esquema lo crea `script-core.sql`. `synchronize` queda apagado a
        // propósito: el script es la fuente de verdad y TypeORM no debe
        // reinterpretar los enums ni los constraints en cada arranque.
        synchronize: false,
        logging: config.get<string>('DB_LOGGING') === 'true',
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    JwtConfigModule,
    CommonModule,

    PatientModule,
    TherapistModule,
    ExerciseModule,
    SessionModule,
    ProgressModule,
    ClinicalModule,
    TelemetryModule,
  ],
})
export class AppModule {}
