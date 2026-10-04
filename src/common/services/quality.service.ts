import {
  POOR_QUALITY_MIN_ANGLE,
  QUALITY_NEAR_TARGET_RATIO,
  QualityLevel,
} from '../enum/execution.enum';

/**
 * Reproduce la clasificación de calidad de `ExecutionScreen.tsx`:
 *
 *   inRange         = angle >= target.min && angle <= target.max
 *   aboveThreshold  = angle >= target.max * 0.8
 *   quality         = inRange || aboveThreshold ? 'Buena'
 *                    : angle >= 20                ? 'Regular'
 *                                                  : 'Mala'
 *
 * OJO: la regla original usa SOLO el ángulo. La fuerza se registra aparte y no
 * participa de la clasificación.
 */
export function calculateQuality(
  angle: number,
  targetMin: number,
  targetMax: number,
): QualityLevel {
  const inRange = angle >= targetMin && angle <= targetMax;
  const nearTarget = angle >= targetMax * QUALITY_NEAR_TARGET_RATIO;

  if (inRange || nearTarget) {
    return QualityLevel.GOOD;
  }

  return angle >= POOR_QUALITY_MIN_ANGLE ? QualityLevel.REGULAR : QualityLevel.POOR;
}

/**
 * Calidad predominante de una ejecución: la que más se repitió.
 *
 * `ExecutionScreen` cuenta muestras por nivel y se queda con el máximo
 * (`argmax` sobre `qualityCountRef`).
 */
export function dominantQuality(counts: Partial<Record<QualityLevel, number>>): QualityLevel {
  const entries = Object.entries(counts) as [QualityLevel, number][];

  if (entries.length === 0) {
    return QualityLevel.POOR;
  }

  return entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

/**
 * Porcentaje de repeticiones dentro del rango objetivo.
 *
 * Cubre el hueco que tenía la app: mostraba '91%' de calidad sin ningún campo
 * numérico que lo respaldara (sólo tenía el string categórico).
 */
export function qualityPercentage(
  inRangeCount: number,
  totalCount: number,
): number {
  if (!totalCount) return 0;
  return Math.round((inRangeCount / totalCount) * 10000) / 100;
}