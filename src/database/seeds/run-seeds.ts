import { EntityManager } from 'typeorm';
import { ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';
import { AppDataSource } from 'src/database/data-source';
import { EXERCISE_SEEDS, ExerciseSeed } from 'src/database/seeds/exercise-seeds';
import { Exercise } from 'src/exercise/entities/exercise.entity';
import { ExerciseGuideStep } from 'src/exercise/entities/exercise-guide-step.entity';
import { ExerciseRequirement } from 'src/exercise/entities/exercise-requirement.entity';
import { ExerciseTargetMuscle } from 'src/exercise/entities/exercise-target-muscle.entity';

/**
 * Seeds del catálogo de ejercicios.
 *
 * Es idempotente: se puede correr tantas veces como haga falta. Cada ejercicio se
 * busca por `code` (el identificador que el cliente móvil ya tiene hardcodeado) y
 * las tablas hijas se reemplazan por completo. Así el seed corrige contenido
 * desactualizado en lugar de duplicarlo, y `position` nunca queda con huecos por
 * ejercicios que se quitaron de la semilla.
 *
 * No se siembran pacientes, fisioterapeutas ni sesiones: esos ids vienen de
 * authentication-be-microservice y no se pueden inventar.
 */
async function seedExercises(manager: EntityManager): Promise<void> {
  const exercises = manager.getRepository(Exercise);

  for (const seed of EXERCISE_SEEDS) {
    // `instructions` es la representación en texto plano de los pasos: el cliente
    // la arma partiendo este campo por saltos de línea, así que cada línea es un
    // paso. `exercise_guide_steps` guarda la misma información ya normalizada.
    const values = {
      title: seed.title,
      description: seed.description,
      instructions: seed.steps
        .map((step) => `${step.title}: ${step.description}`)
        .join('\n'),
      category: seed.category,
      series: seed.series,
      reps: seed.reps,
      measure_unit: ExerciseMeasureUnit.REPETITIONS,
      rest_seconds: seed.restSeconds,
      target_min_angle: seed.targetMinAngle,
      target_max_angle: seed.targetMaxAngle,
      video_url: null,
      cover_image_url: null,
      video_duration_seconds: seed.videoDurationSeconds,
      is_active: true,
    };

    const existing = await exercises.findOne({ where: { code: seed.code } });
    const exercise = existing
      ? await exercises.save({ ...existing, ...values })
      : await exercises.save(exercises.create({ ...values, code: seed.code }));

    await replaceChildren(manager, seed, exercise.exercise_id);

    console.log(
      `  ${existing ? 'actualizado' : 'creado    '} ${seed.code} ` +
        `(id ${exercise.exercise_id}) ${seed.title}`,
    );
  }
}

/**
 * Reemplaza las filas hijas. Se borran y se reinsertan en vez de hacer upsert
 * porque `position` es UNIQUE junto al padre: actualizar el contenido dejando las
 * filas viejas chocaría contra el índice.
 */
async function replaceChildren(
  manager: EntityManager,
  seed: ExerciseSeed,
  exerciseId: number,
): Promise<void> {
  const requirements = manager.getRepository(ExerciseRequirement);
  const targetMuscles = manager.getRepository(ExerciseTargetMuscle);
  const guideSteps = manager.getRepository(ExerciseGuideStep);

  await requirements.delete({ exercise_id: exerciseId });
  await targetMuscles.delete({ exercise_id: exerciseId });
  await guideSteps.delete({ exercise_id: exerciseId });

  if (seed.requirements.length > 0) {
    await requirements.save(
      seed.requirements.map((requirement, index) =>
        requirements.create({
          exercise_id: exerciseId,
          position: index + 1,
          requirement,
        }),
      ),
    );
  }

  if (seed.targetMuscles.length > 0) {
    await targetMuscles.save(
      seed.targetMuscles.map((muscle, index) =>
        targetMuscles.create({
          exercise_id: exerciseId,
          position: index + 1,
          muscle,
        }),
      ),
    );
  }

  if (seed.steps.length > 0) {
    await guideSteps.save(
      seed.steps.map((step, index) =>
        guideSteps.create({
          exercise_id: exerciseId,
          position: index + 1,
          title: step.title,
          description: step.description,
          // Los assets de la guía vienen empaquetados en el bundle de React
          // Native, no son URLs servibles.
          image_url: null,
        }),
      ),
    );
  }
}

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();

  try {
    console.log('Sembrando catálogo de ejercicios...');

    // Todo dentro de una transacción: si un ejercicio falla a mitad de camino no
    // puede quedar con sus tablas hijas borradas y sin volver a insertar.
    await AppDataSource.transaction((manager) => seedExercises(manager));

    console.log(`Listo. ${EXERCISE_SEEDS.length} ejercicios.`);
  } finally {
    await AppDataSource.destroy();
  }
}

bootstrap().catch((error) => {
  console.error('Falló el seed:', error.message);
  process.exit(1);
});
