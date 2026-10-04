/**
 * Calidad de una repetición, tal como la clasifica la pantalla de ejecución.
 *
 * Regla original (`src/screens/execution/ExecutionScreen.tsx`): es "Buena" si el
 * ángulo cae dentro del rango objetivo o llega al 80% del máximo; "Regular" si
 * supera 20 grados; "Mala" en cualquier otro caso. O sea, la fuerza no influye
 * en la clasificación. `calculateQuality` conserva esa regla.
 */
export enum QualityLevel {
  GOOD = 'Buena',
  REGULAR = 'Regular',
  POOR = 'Mala',
}

/** Umbral por debajo del cual una repetición se considera "Mala". */
export const POOR_QUALITY_MIN_ANGLE = 20;

/**
 * Fracción del máximo del rango objetivo a partir de la cual la repetición
 * sigue contando como "Buena" aunque no entre en la banda.
 */
export const QUALITY_NEAR_TARGET_RATIO = 0.8;