import { ClinicalAssessment } from 'src/clinical/entities/clinical-assessment.entity';
import { ClinicalRecord } from 'src/clinical/entities/clinical-record.entity';
import { Notification } from 'src/clinical/entities/notification.entity';
import { DeviceSession } from 'src/device/entities/device-session.entity';
import { Device } from 'src/device/entities/device.entity';
import { RepetitionLog } from 'src/device/entities/repetition-log.entity';
import { ExerciseGuideStep } from 'src/exercise/entities/exercise-guide-step.entity';
import { ExerciseRequirement } from 'src/exercise/entities/exercise-requirement.entity';
import { ExerciseTargetMuscle } from 'src/exercise/entities/exercise-target-muscle.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { Patient } from 'src/patient/entities/patient.entity';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';
import { ProgressSnapshot } from 'src/progress/entities/progress-snapshot.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { Session } from 'src/session/entities/session.entity';
import { TreatmentPlan } from 'src/session/entities/treatment-plan.entity';
import { Therapist } from 'src/therapist/entities/therapist.entity';

/**
 * Las 17 entidades del dominio, en el orden en que las crea `script-core.sql`.
 *
 * Se listan explícitamente en vez de usar `autoLoadEntities` para que el
 * registro coincida con el script y ninguna tabla quede sin mapper por olvido.
 *
 * El orden de `TypeOrmModule.forFeature` no importa: las claves foráneas se
 * resuelven por metadata de TypeORM, no por posición.
 */
export const ENTITIES = [
  // Perfiles
  Patient,
  Therapist,
  TherapistPatient,

  // Catálogo de ejercicios
  Exercise,
  ExerciseRequirement,
  ExerciseTargetMuscle,
  ExerciseGuideStep,

  // Sesiones
  Session,
  SessionExercise,
  TreatmentPlan,

  // Progreso
  ProgressSnapshot,

  // Información clínica
  ClinicalRecord,
  ClinicalAssessment,
  Notification,

  // Dispositivos y telemetría
  Device,
  DeviceSession,
  RepetitionLog,
];
