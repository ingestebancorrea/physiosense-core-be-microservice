/**
 * Categorías de ejercicio.
 *
 * `Todos` existe en la app móvil como chip de filtro (`ExerciseCategory` en
 * types/exercise.ts) pero nunca es el valor persistido de un ejercicio, así que
 * acá no forma parte del enum de base.
 */
export enum ExerciseCategory {
  HAND = 'Mano',
  FINGERS = 'Dedos',
  WRIST = 'Muñeca',
}

export const ALL_EXERCISE_CATEGORIES: ExerciseCategory[] = [
  ExerciseCategory.HAND,
  ExerciseCategory.FINGERS,
  ExerciseCategory.WRIST,
];

/**
 * Como se expresa la cantidad de trabajo de un ejercicio.
 *
 * El pool de sesiones de la app (`src/mock/sessionData.ts`) define
 * `exercise_08` con `repetitions: '20 seg'`, o sea una cantidad de segundos en
 * un campo que en el resto del pool significa repeticiones. Se necesita el
 * discriminante para no leer "20" como 20 repeticiones.
 */
export enum ExerciseMeasureUnit {
  REPETITIONS = 'REPETITIONS',
  SECONDS = 'SECONDS',
}