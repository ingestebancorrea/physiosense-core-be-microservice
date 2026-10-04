import { ExerciseCategory } from 'src/common/enum/exercise.enum';

export interface ExerciseSeedStep {
  title: string;
  description: string;
}

export interface ExerciseSeed {
  code: string;
  title: string;
  description: string;
  category: ExerciseCategory;
  series: number;
  reps: number;
  restSeconds: number;
  videoDurationSeconds: number;
  targetMinAngle: number;
  targetMaxAngle: number;
  requirements: string[];
  targetMuscles: string[];
  steps: ExerciseSeedStep[];
}

/**
 * Contenido de los cuatro ejercicios que el cliente movil tiene hardcodeados.
 *
 * Origen de cada campo (referencia del cliente, commit c58ead3):
 *
 *   code / title / description  src/mock/exerciseData.ts
 *   series / reps               src/screens/execution/exerciseConfig.ts
 *   target_min/max_angle        src/screens/execution/exerciseConfig.ts (TARGET_RANGES)
 *   steps                       src/screens/exercise-guide/data/guide*.ts
 *   requirements / targetMuscles  src/screens/exercise/data/*.ts (ExerciseDetail)
 *   rest_seconds                src/screens/exercise/data/*.ts (`restTimeSeconds`)
 *
 * Decisiones tomadas donde los mocks del movil no coinciden (2026-10-04):
 *
 *  * `rest_seconds` sale de `restTimeSeconds` de la pantalla de detalle, no del
 *    campo `duration` del listado. El detalle declara 30 para los cuatro
 *    ejercicios, mientras el listado muestra '45 seg' para Pinza y '40 seg'
 *    para Oposicion del pulgar. Se eligio el detalle por ser el campo con nombre
 *    explicito; si el listado es la fuente real, hay que corregir el detalle del
 *    movil, no esta semilla.
 *
 *  * `exercise_04` ("Oposicion del pulgar") queda en categoria `Dedos`, no en
 *    `Muneca` como dice `exerciseData.ts`: es musculatura del pulgar. El mock
 *    del listado va a quedar desalineado con el catalogo.
 *
 *  * `exercise_03` ("Pinza") queda con 4 series. `exerciseData.ts` y
 *    `pinza.ts` dicen 4; `therapistExercisesData.ts` dice 3.
 *
 *  * `exercise_04` se llama "Oposicion del pulgar". `therapistExercisesData.ts`
 *    lo llama "Flexion de muneca", pero es el unico lugar que lo hace: las
 *    pantallas de detalle y guia, `sessionData.ts`, `EjercicioListScreen.tsx` y
 *    los tests del cliente usan "Oposicion del pulgar".
 *
 * `video_duration_seconds` es 45 en los cuatro detalles. El cliente no tiene los
 * archivos de video subidos, asi que `video_url` y `cover_image_url` se siembran
 * en NULL: los assets van empaquetados en el bundle de React Native y no son
 * URLs servibles.
 */
export const EXERCISE_SEEDS: ExerciseSeed[] = [
  {
    code: 'exercise_01',
    title: 'Cerrar la mano',
    description: 'Fortalecimiento de los músculos flexores de la mano',
    category: ExerciseCategory.HAND,
    series: 3,
    reps: 15,
    restSeconds: 30,
    videoDurationSeconds: 45,
    targetMinAngle: 60,
    targetMaxAngle: 90,
    requirements: [
      'Usa el guante correctamente',
      'Mantén la muñeca alineada con el antebrazo',
      'Realiza cada repetición de forma lenta y controlada',
    ],
    targetMuscles: ['Flexores de los dedos', 'Flexor largo del pulgar'],
    steps: [
      {
        title: 'Colócate el guante',
        description:
          'Ajusta el guante correctamente, verificando que la muñeca quede alineada con el antebrazo.',
      },
      {
        title: 'Posición inicial',
        description:
          'Mantén la mano abierta y relajada apoyada sobre una superficie estable.',
      },
      {
        title: 'Cierra el puño',
        description:
          'Flexiona los dedos lentamente hasta cerrar el puño sin forzar la muñeca.',
      },
      {
        title: 'Mantén la posición',
        description:
          'Sostén el puño cerrado durante unos segundos manteniendo la postura.',
      },
      {
        title: 'Regresa y repite',
        description:
          'Abre la mano con control y repite el movimiento durante toda la serie.',
      },
    ],
  },
  {
    code: 'exercise_02',
    title: 'Abrir la mano',
    description: 'Movilidad y apertura completa de la mano',
    category: ExerciseCategory.HAND,
    series: 3,
    reps: 15,
    restSeconds: 30,
    videoDurationSeconds: 45,
    targetMinAngle: 50,
    targetMaxAngle: 80,
    requirements: [
      'Usa el guante correctamente',
      'Abre los dedos de forma progresiva',
      'Evita movimientos bruscos',
    ],
    targetMuscles: [
      'Extensores de los dedos',
      'Extensor común de los dedos',
      'Músculos interóseos dorsales',
    ],
    steps: [
      {
        title: 'Colócate el guante',
        description:
          'Ajusta el guante correctamente, con la muñeca alineada con el antebrazo.',
      },
      {
        title: 'Posición inicial',
        description:
          'Cierra la mano en un puño relajado, sin ejercer tensión en los dedos.',
      },
      {
        title: 'Abre los dedos',
        description:
          'Separa los dedos al máximo de forma progresiva, sin forzar el movimiento.',
      },
      {
        title: 'Mantén la posición',
        description:
          'Sostén los dedos abiertos unos segundos sintiendo el estiramiento.',
      },
      {
        title: 'Regresa y repite',
        description:
          'Vuelve a cerrar la mano con control y repite el movimiento de apertura.',
      },
    ],
  },
  {
    code: 'exercise_03',
    title: 'Pinza',
    description: 'Precisión y fuerza en la pinza fina del pulgar e índice',
    category: ExerciseCategory.FINGERS,
    series: 4,
    reps: 12,
    restSeconds: 30,
    videoDurationSeconds: 45,
    targetMinAngle: 30,
    targetMaxAngle: 60,
    requirements: [
      'Usa el guante correctamente',
      'Fija la muñeca durante el movimiento',
      'Mantén la pinza firme en cada repetición',
    ],
    targetMuscles: [
      'Flexor largo del pulgar',
      'Flexor profundo del índice',
      'Músculos de la eminencia tenar',
    ],
    steps: [
      {
        title: 'Colócate el guante',
        description:
          'Ajusta el guante correctamente y fija la muñeca durante todo el movimiento.',
      },
      {
        title: 'Posición inicial',
        description:
          'Mantén la palma abierta con los dedos relajados y extendidos.',
      },
      {
        title: 'Une las yemas',
        description:
          'Junta la yema del pulgar con la del índice ejerciendo una pinza firme.',
      },
      {
        title: 'Mantén la pinza',
        description:
          'Sostén la pinza durante unos segundos sin despegar las yemas.',
      },
      {
        title: 'Suelta y repite',
        description:
          'Afloja con control y repite la pinza en cada repetición de la serie.',
      },
    ],
  },
  {
    code: 'exercise_04',
    title: 'Oposición del pulgar',
    description: 'Coordinación del pulgar para tocar cada dedo de la mano',
    category: ExerciseCategory.FINGERS,
    series: 3,
    reps: 10,
    restSeconds: 30,
    videoDurationSeconds: 45,
    targetMinAngle: 40,
    targetMaxAngle: 70,
    requirements: [
      'Usa el guante correctamente',
      'Toca cada dedo sin mover la palma',
      'Realiza el recorrido de forma lenta',
    ],
    targetMuscles: [
      'Oponente del pulgar',
      'Flexor corto del pulgar',
      'Aductor del pulgar',
    ],
    steps: [
      {
        title: 'Colócate el guante',
        description:
          'Ajusta el guante correctamente, con la palma de la mano hacia arriba.',
      },
      {
        title: 'Posición inicial',
        description:
          'Mantén la mano abierta y la palma sin moverse durante todo el recorrido.',
      },
      {
        title: 'Toca cada dedo',
        description:
          'Lleva el pulgar a tocar la yema del índice, del medio, del anular y del meñique.',
      },
      {
        title: 'Recorre en orden',
        description:
          'Realiza el recorrido de forma lenta y secuencial, sin saltarte ningún dedo.',
      },
      {
        title: 'Repite la secuencia',
        description:
          'Vuelve al inicio y repite el recorrido completo en cada serie.',
      },
    ],
  },
];
