/**
 * Tipos de registro clínico.
 *
 * `PatientDetailScreen` tiene una pestaña "Evaluaciones" y el dashboard del
 * fisioterapeuta muestra "Evaluaciones pendientes", así que la evaluación
 * (ClinicalAssessment) es una entidad aparte y no un `type` de la nota.
 */
export enum ClinicalRecordType {
  ASSESSMENT = 'ASSESSMENT',
  DIAGNOSIS = 'DIAGNOSIS',
  TREATMENT = 'TREATMENT',
  EVOLUTION = 'EVOLUTION',
  NOTE = 'NOTE',
}

export const CLINICAL_RECORD_TYPE_LABEL: Record<ClinicalRecordType, string> = {
  [ClinicalRecordType.ASSESSMENT]: 'Evaluación',
  [ClinicalRecordType.DIAGNOSIS]: 'Diagnóstico',
  [ClinicalRecordType.TREATMENT]: 'Tratamiento',
  [ClinicalRecordType.EVOLUTION]: 'Evolución',
  [ClinicalRecordType.NOTE]: 'Nota',
};

export enum AssessmentType {
  INITIAL = 'INITIAL',
  PERIODIC = 'PERIODIC',
  FINAL = 'FINAL',
}

export const ASSESSMENT_TYPE_LABEL: Record<AssessmentType, string> = {
  [AssessmentType.INITIAL]: 'Inicial',
  [AssessmentType.PERIODIC]: 'Periódica',
  [AssessmentType.FINAL]: 'Final',
};

/**
 * Escala de dolor que se registra junto a cada evaluación.
 * La app no la define todavía, se usa la escala clínica de 0 a 10.
 */
export const MIN_PAIN_SCALE = 0;
export const MAX_PAIN_SCALE = 10;

/**
 * Rango de arco articular que la app muestra en el gráfico de progreso
 * (`MotionChartPoint.value`, en grados).
 */
export const MIN_ROM_DEGREES = 0;
export const MAX_ROM_DEGREES = 180;