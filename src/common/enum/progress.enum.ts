/**
 * Periodicidad con la que se agrega el progreso.
 *
 * En la app móvil `ProgressPeriod` es 'Día' | 'Semana' | 'Mes' | 'Año' y el
 * campo `MotionChartPoint.day` se sobrecarga según el periodo: nombres de día
 * ('Lun'..'Dom') en Semana, horas ('8:00'..'18:00') en Día, número de semana
 * ('S1'..'S4') en Mes y trimestre ('T1'..'T4') en Año.
 *
 * Persistir el bucket junto con `period_start` / `period_end` evita repetir ese
 * problema: la etiqueta la arma el cliente a partir de las fechas.
 */
export enum ProgressPeriod {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export const PROGRESS_PERIOD_LABEL: Record<ProgressPeriod, string> = {
  [ProgressPeriod.DAY]: 'Día',
  [ProgressPeriod.WEEK]: 'Semana',
  [ProgressPeriod.MONTH]: 'Mes',
  [ProgressPeriod.YEAR]: 'Año',
};

export const PERIOD_UNIT_DAYS: Record<ProgressPeriod, number> = {
  [ProgressPeriod.DAY]: 1,
  [ProgressPeriod.WEEK]: 7,
  [ProgressPeriod.MONTH]: 30,
  [ProgressPeriod.YEAR]: 365,
};