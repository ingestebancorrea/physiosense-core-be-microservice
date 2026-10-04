import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';
import {
  ExerciseCategory,
  ExerciseMeasureUnit,
} from 'src/common/enum/exercise.enum';
import { Exercise } from './entities/exercise.entity';
import { ExerciseRequirement } from './entities/exercise-requirement.entity';
import { ExerciseTargetMuscle } from './entities/exercise-target-muscle.entity';
import { ExerciseGuideStep } from './entities/exercise-guide-step.entity';
import {
  CreateExerciseDto,
  ExerciseListQueryDto,
} from './dto/create-exercise.dto';
import { ExerciseResponseDto } from './dto/exercise-response.dto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseRequirement)
    private readonly requirementRepository: Repository<ExerciseRequirement>,
    @InjectRepository(ExerciseTargetMuscle)
    private readonly targetMuscleRepository: Repository<ExerciseTargetMuscle>,
    @InjectRepository(ExerciseGuideStep)
    private readonly guideStepRepository: Repository<ExerciseGuideStep>,
  ) {}

  /** Categorías persistibles. El chip "Todos" lo arma el cliente. */
  listCategories(): { value: ExerciseCategory; label: string }[] {
    return [
      { value: ExerciseCategory.HAND, label: 'Mano' },
      { value: ExerciseCategory.FINGERS, label: 'Dedos' },
      { value: ExerciseCategory.WRIST, label: 'Muñeca' },
    ];
  }

  async create(dto: CreateExerciseDto, createdByUserId: number): Promise<ExerciseResponseDto> {
    const code = await this.nextCode();

    this.assertTargetRange(dto.target_range?.min, dto.target_range?.max);

    const exercise = this.exerciseRepository.create({
      code,
      title: dto.title,
      description: this.normalizeText(dto.description),
      instructions: this.normalizeText(dto.instructions),
      // La pantalla de la app no manda categoría; el catálogo es de mano, así
      // que se asume la más amplia en lugar de rechazar el alta.
      category: dto.category ?? ExerciseCategory.HAND,
      series: dto.series,
      reps: dto.reps,
      measure_unit: dto.measure_unit ?? ExerciseMeasureUnit.REPETITIONS,
      rest_seconds: dto.rest_seconds,
      target_min_angle: dto.target_range?.min ?? null,
      target_max_angle: dto.target_range?.max ?? null,
      video_url: this.normalizeText(dto.video_url),
      cover_image_url: this.normalizeText(dto.cover_image_url),
      video_duration_seconds: dto.video_duration_seconds ?? null,
      created_by_user_id: createdByUserId,
      is_active: true,
    });

    const saved = await this.exerciseRepository.save(exercise);

    await this.replaceChildren(saved.exercise_id, dto);
    await this.syncGuideSteps(saved.exercise_id, dto.instructions);

    return this.findOneByCode(saved.code);
  }

  async findAll(query: ExerciseListQueryDto): Promise<ExerciseResponseDto[]> {
    const qb = this.exerciseRepository
      .createQueryBuilder('exercise')
      .leftJoinAndSelect('exercise.requirements', 'requirements')
      .leftJoinAndSelect('exercise.target_muscles', 'target_muscles')
      .leftJoinAndSelect('exercise.guide_steps', 'guide_steps')
      .where('exercise.is_active = true');

    if (query.category) {
      qb.andWhere('exercise.category = :category', { category: query.category });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(exercise.title) LIKE :search OR LOWER(exercise.description) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }

    qb.orderBy('exercise.title', 'ASC')
      // El orden de las tablas hijas se fija en el mapper, no en la query.
      .addOrderBy('requirements.position', 'ASC')
      .addOrderBy('target_muscles.position', 'ASC')
      .addOrderBy('guide_steps.position', 'ASC');

    const exercises = await qb.getMany();

    return exercises.map((exercise) => this.toResponse(exercise));
  }

  /** Búsqueda por el código estable ('exercise_01') que usa la app. */
  async findOneByCode(code: string): Promise<ExerciseResponseDto> {
    const exercise = await this.loadBy({ code });

    if (!exercise) {
      throw new NotFoundException(ErrorMessages.EXERCISE_NOT_FOUND);
    }

    return this.toResponse(exercise);
  }

  async findOneById(exerciseRef: string | number): Promise<ExerciseResponseDto> {
    const exercise = await this.loadByRef(exerciseRef);

    return this.toResponse(exercise);
  }

  /** Resuelve varios códigos de una vez, para armar las sesiones. */
  async resolveByCodes(codes: string[]): Promise<Map<string, Exercise>> {
    if (codes.length === 0) return new Map();

    const exercises = await this.exerciseRepository.find({ where: { code: In(codes) } });
    const map = new Map<string, Exercise>();

    for (const exercise of exercises) {
      map.set(exercise.code, exercise);
    }

    return map;
  }

  /**
   * Alta / edición: la ruta acepta el código estable o el id numérico.
   *
   * La app llama `PUT /exercises/${id}` con `ExerciseItem.id`, y en todos los
   * mocks ese id es el código ('exercise_01'), no el autoincremental.
   */
  async update(
    exerciseRef: string | number,
    dto: Partial<CreateExerciseDto>,
  ): Promise<ExerciseResponseDto> {
    const exercise = await this.exerciseRepository.findOne({
      where: this.toWhere(exerciseRef),
    });

    if (!exercise) {
      throw new NotFoundException(ErrorMessages.EXERCISE_NOT_FOUND);
    }

    this.assertTargetRange(dto.target_range?.min, dto.target_range?.max);

    Object.assign(exercise, {
      title: dto.title ?? exercise.title,
      description: this.normalizeText(dto.description) ?? exercise.description,
      instructions: this.normalizeText(dto.instructions) ?? exercise.instructions,
      category: dto.category ?? exercise.category,
      series: dto.series ?? exercise.series,
      reps: dto.reps ?? exercise.reps,
      measure_unit: dto.measure_unit ?? exercise.measure_unit,
      rest_seconds: dto.rest_seconds ?? exercise.rest_seconds,
      target_min_angle: dto.target_range ? dto.target_range.min : exercise.target_min_angle,
      target_max_angle: dto.target_range ? dto.target_range.max : exercise.target_max_angle,
      video_url: this.normalizeText(dto.video_url) ?? exercise.video_url,
      cover_image_url: this.normalizeText(dto.cover_image_url) ?? exercise.cover_image_url,
      video_duration_seconds:
        dto.video_duration_seconds ?? exercise.video_duration_seconds,
    });

    const saved = await this.exerciseRepository.save(exercise);

    await this.replaceChildren(saved.exercise_id, dto);
    await this.syncGuideSteps(saved.exercise_id, dto.instructions);

    return this.findOneByCode(saved.code);
  }

  /**
   * Baja lógica: los ejercicios ya usados por sesiones no se borran porque
   * `session_exercises.exercise_id` es RESTRICT.
   */
  async deactivate(exerciseRef: string | number): Promise<ExerciseResponseDto> {
    const exercise = await this.exerciseRepository.findOne({
      where: this.toWhere(exerciseRef),
    });

    if (!exercise) {
      throw new NotFoundException(ErrorMessages.EXERCISE_NOT_FOUND);
    }

    exercise.is_active = false;
    await this.exerciseRepository.save(exercise);

    return this.findOneByCode(exercise.code);
  }

  /** Un id numérico busca por `exercise_id`; cualquier otra cosa, por `code`. */
  private toWhere(exerciseRef: string | number): Record<string, unknown> {
    return typeof exerciseRef === 'number'
      ? { exercise_id: exerciseRef }
      : /^\d+$/.test(exerciseRef)
        ? { exercise_id: Number(exerciseRef) }
        : { code: exerciseRef };
  }

  private async loadByRef(exerciseRef: string | number): Promise<Exercise> {
    const exercise = await this.loadBy(this.toWhere(exerciseRef));

    if (!exercise) {
      throw new NotFoundException(ErrorMessages.EXERCISE_NOT_FOUND);
    }

    return exercise;
  }

  /**
   * La app manda strings vacíos (y a veces `file://` locales) donde la tabla
   * espera una URL o NULL. Se homogeniza acá para no ensuciar el mapper.
   */
  private normalizeText(value?: string): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  /** `Mm:ss`, el formato que la app ya sabe mostrar. */
  private formatVideoDuration(seconds?: number): string | null {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
      return null;
    }

    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);

    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  private async loadBy(where: Record<string, unknown>): Promise<Exercise | undefined> {
    return this.exerciseRepository.findOne({
      where,
      relations: { requirements: true, target_muscles: true, guide_steps: true },
    });
  }

  private async nextCode(): Promise<string> {
    const last = await this.exerciseRepository.findOne({
      where: {},
      order: { exercise_id: 'DESC' },
    });

    const nextNumber = (last?.exercise_id ?? 0) + 1;

    return `exercise_${String(nextNumber).padStart(2, '0')}`;
  }

  private assertTargetRange(min?: number, max?: number): void {
    if (min === undefined || max === undefined) return;

    if (min >= max) {
      throw new BadRequestException(ErrorMessages.INVALID_TARGET_RANGE);
    }
  }

  /**
   * Reemplaza requisitos y músculos objetivo sólo cuando vienen en el payload,
   * para que un PUT parcial no borre lo que no se envió.
   */
  private async replaceChildren(
    exerciseId: number,
    dto: Partial<CreateExerciseDto>,
  ): Promise<void> {
    if (dto.requirements) {
      await this.requirementRepository.delete({ exercise_id: exerciseId });
      await this.requirementRepository.save(
        dto.requirements
          .map((requirement, index) => ({
            exercise_id: exerciseId,
            position: index + 1,
            requirement: requirement.trim(),
          }))
          .filter((row) => row.requirement.length > 0),
      );
    }

    if (dto.target_muscles) {
      await this.targetMuscleRepository.delete({ exercise_id: exerciseId });
      await this.targetMuscleRepository.save(
        dto.target_muscles
          .map((muscle, index) => ({
            exercise_id: exerciseId,
            position: index + 1,
            muscle: muscle.trim(),
          }))
          .filter((row) => row.muscle.length > 0),
      );
    }
  }

  /**
   * Materializa la guía a partir de `instructions`.
   *
   * El cliente hace lo mismo (`previewMapper.ts` parte el texto por '\n'), pero
   * de este lado queda persistido para poder asociar imágenes a un paso.
   * Sólo se regenera si viene `instructions` en el payload.
   */
  private async syncGuideSteps(
    exerciseId: number,
    instructions?: string,
  ): Promise<void> {
    if (instructions === undefined) return;

    await this.guideStepRepository.delete({ exercise_id: exerciseId });

    const lines = instructions
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    await this.guideStepRepository.save(
      lines.map((line, index) => ({
        exercise_id: exerciseId,
        position: index + 1,
        title: `Paso ${index + 1}`,
        description: line,
        image_url: null,
      })),
    );
  }

  private toResponse(exercise: Exercise): ExerciseResponseDto {
    const requirements = [...(exercise.requirements ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const targetMuscles = [...(exercise.target_muscles ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const guideSteps = [...(exercise.guide_steps ?? [])].sort(
      (a, b) => a.position - b.position,
    );

    const hasRange =
      exercise.target_min_angle !== null && exercise.target_max_angle !== null;

    return {
      id: exercise.code,
      exercise_id: exercise.exercise_id,
      title: exercise.title,
      description: exercise.description,
      instructions: exercise.instructions,
      category: exercise.category,
      series: exercise.series,
      reps: exercise.reps,
      measure_unit: exercise.measure_unit,
      restSeconds: exercise.rest_seconds,
      duration: this.formatVideoDuration(exercise.video_duration_seconds),
      targetRange: hasRange
        ? {
            min: Number(exercise.target_min_angle),
            max: Number(exercise.target_max_angle),
          }
        : undefined,
      requirements: requirements.map((r) => r.requirement),
      targetMuscles: targetMuscles.map((m) => m.muscle),
      imageUri: exercise.cover_image_url,
      videoThumbnailUri: exercise.cover_image_url,
      videoDuration: this.formatVideoDuration(exercise.video_duration_seconds),
      video_url: exercise.video_url,
      cover_image_url: exercise.cover_image_url,
      guideSteps: guideSteps.map((step) => ({
        position: step.position,
        title: step.title,
        description: step.description,
        image_url: step.image_url,
      })),
      is_active: exercise.is_active,
    };
  }
}