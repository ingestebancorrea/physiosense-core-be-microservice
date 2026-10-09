import { ClinicalAssessment } from 'src/clinical/entities/clinical-assessment.entity';
import { ClinicalRecord } from 'src/clinical/entities/clinical-record.entity';
import { ExerciseGuideStep } from 'src/exercise/entities/exercise-guide-step.entity';
import { ExerciseRequirement } from 'src/exercise/entities/exercise-requirement.entity';
import { ExerciseTargetMuscle } from 'src/exercise/entities/exercise-target-muscle.entity';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { PatientProfile } from 'src/patient/entities/patient-profile.entity';
import { TherapistPatient } from 'src/patient/entities/therapist-patient.entity';
import { ProgressSnapshot } from 'src/progress/entities/progress-snapshot.entity';
import { SessionExercise } from 'src/session/entities/session-exercise.entity';
import { Session } from 'src/session/entities/session.entity';
import { TreatmentPlan } from 'src/session/entities/treatment-plan.entity';
import { RepetitionLog } from 'src/telemetry/entities/repetition-log.entity';

/**
 * Las 13 entidades del dominio, en el orden en que las crea `script-core.sql`.
 *
 * Se listan explícitamente en vez de usar `autoLoadEntities` para que el
 * registro coincida con el script y ninguna tabla quede sin mapper por olvido.
 *
 * `patients` y `therapists` NO estan: viven en authentication-be-microservice y
 * aca solo quedan sus ids sueltos (`patient_profiles.patient_id`,
 * `therapist_id`). La identidad se trae por REST con `AuthClient`.
 *
 * `notifications`, `devices` y `device_sessions` tampoco: sus microservicios
 * son dueños de esas tablas. La telemetria clinica (`repetition_logs`) si vive
 * en este servicio.
 *
 * El orden de `TypeOrmModule.forFeature` no importa: las claves foráneas se
 * resuelven por metadata de TypeORM, no por posición.
 */
export const ENTITIES = [
  // Perfiles
  PatientProfile,
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

  // Telemetría
  RepetitionLog,
];