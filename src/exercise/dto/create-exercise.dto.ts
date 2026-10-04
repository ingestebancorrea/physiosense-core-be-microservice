import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ExerciseCategory,
  ExerciseMeasureUnit,
} from 'src/common/enum/exercise.enum';

/** Rango objetivo de flexión en grados. */
export class TargetRangeDto {
  @ApiProperty({ example: 60, minimum: 0, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(180)
  min: number;

  @ApiProperty({ example: 90, minimum: 0, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(180)
  max: number;
}

/**
 * Alta / edición de un ejercicio.
 *
 * Es el mismo cuerpo que ya manda la app en `POST /exercises` y
 * `PUT /exercises/{id}`, o sea `SaveExercisePayload`
 * (`src/services/exerciseService.ts`):
 *
 *   { title, description, instructions, series, reps, restSeconds,
 *     requirements, targetMuscles, videoUrl, coverImageUrl }
 *
 * Ojo con el contrato: la app manda camelCase (`restSeconds`, `targetMuscles`,
 * `videoUrl`, `coverImageUrl`) y esos nombres se aceptan tal cual mediante
 * `@Expose`, mientras que en la base el nombre es snake_case. Todos los demás
 * campos coinciden en ambos lados.
 *
 * La pantalla todavía arma el ejercicio en local y no llama a la API
 * (`CreateExerciseScreen.handleSave` ignora `exerciseService`), así que el
 * payload real puede venir con `videoUrl`/`coverImageUrl` apuntando a un
 * `file://` local o vacío. Por eso esas dos no se validan como URL: el flujo
 * definitivo es subirlas primero por `/exercises/media/{video,image}` y mandar
 * la URL que devuelve ese endpoint.
 */
export class CreateExerciseDto {
  @ApiProperty({ example: 'Cerrar la mano' })
  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    example: 'Ejercicio para activar los flexores de los dedos.',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Instrucciones paso a paso. Cada línea es un paso de la guía.',
  })
  @IsOptional()
  @IsString()
  instructions: string;

  @ApiPropertyOptional({ enum: ExerciseCategory, default: ExerciseCategory.HAND })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiProperty({ example: 3, default: 3 })
  @IsInt()
  @Min(1)
  @Max(20)
  series: number;

  @ApiProperty({ example: 15, default: 15 })
  @IsInt()
  @Min(1)
  @Max(200)
  reps: number;

  @ApiPropertyOptional({
    enum: ExerciseMeasureUnit,
    default: ExerciseMeasureUnit.REPETITIONS,
    description: 'Si `reps` son repeticiones o segundos.',
  })
  @IsOptional()
  @IsEnum(ExerciseMeasureUnit)
  measure_unit?: ExerciseMeasureUnit;

  @ApiProperty({ example: 30, default: 30, description: 'La app lo manda como `restSeconds`' })
  @Expose({ name: 'restSeconds' })
  @IsInt()
  @Min(0)
  @Max(600)
  rest_seconds: number;

  @ApiPropertyOptional({ type: TargetRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetRangeDto)
  target_range?: TargetRangeDto;

  @ApiPropertyOptional({
    example: ['Usa el guante correctamente', 'Mantén la muñeca alineada'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({
    example: ['Flexores de los dedos', 'Flexor largo del pulgar'],
    type: [String],
    description: 'La app lo manda como `targetMuscles`',
  })
  @IsOptional()
  @Expose({ name: 'targetMuscles' })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  target_muscles?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.physiosense.co/exercises/close.mp4',
    description:
      'La app lo manda como `videoUrl`. Acepta vacío o un `file://` local mientras ' +
      'no se haya subido el archivo por `POST /exercises/media/video`.',
  })
  @IsOptional()
  @Expose({ name: 'videoUrl' })
  @IsString()
  @MaxLength(500)
  video_url: string;

  @ApiPropertyOptional({
    example: 'https://cdn.physiosense.co/exercises/close.jpg',
    description: 'La app lo manda como `coverImageUrl`.',
  })
  @IsOptional()
  @Expose({ name: 'coverImageUrl' })
  @IsString()
  @MaxLength(500)
  cover_image_url: string;

  @ApiPropertyOptional({
    example: 45,
    description: 'Duración del video en segundos. La app la muestra como M:SS.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  video_duration_seconds?: number;
}

/** Reemplazo total de los ejercicios de una sesión. */
export class SessionExerciseInputDto {
  @ApiProperty({ example: 'exercise_01', description: 'code del catálogo' })
  @IsString()
  @Length(1, 40)
  exercise_code: string;

  @ApiPropertyOptional({ example: 3, description: 'Override de las series del catálogo' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  series?: number;

  @ApiPropertyOptional({ example: 15, description: 'Override de las repeticiones' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  reps?: number;
}

export class ExerciseListQueryDto {
  @ApiPropertyOptional({ enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ description: 'Busca por título o descripción' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}