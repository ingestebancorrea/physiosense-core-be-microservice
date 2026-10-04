import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseCategory, ExerciseMeasureUnit } from 'src/common/enum/exercise.enum';

export class ExerciseResponseDto {
  @ApiProperty({ example: 'exercise_01', description: 'Código estable para el cliente' })
  id: string;

  @ApiProperty()
  exercise_id: number;

  @ApiProperty({ example: 'Cerrar la mano' })
  title: string;

  @ApiPropertyOptional()
  description: string;

  @ApiPropertyOptional()
  instructions: string;

  @ApiProperty({ enum: ExerciseCategory })
  category: ExerciseCategory;

  @ApiProperty({ example: 3 })
  series: number;

  @ApiProperty({ example: 15 })
  reps: number;

  @ApiProperty({ enum: ExerciseMeasureUnit })
  measure_unit: ExerciseMeasureUnit;

  @ApiProperty({ example: 30 })
  restSeconds: number;

  @ApiPropertyOptional({
    example: 45,
    description: 'Texto "M:SS" que la app ya sabe pintar',
  })
  duration: string;

  @ApiPropertyOptional({ type: Object, example: { min: 60, max: 90 } })
  targetRange: { min: number; max: number };

  @ApiPropertyOptional({ type: [String] })
  requirements: string[];

  @ApiPropertyOptional({ type: [String] })
  targetMuscles: string[];

  @ApiPropertyOptional({ example: 'glove.png' })
  imageUri: string;

  @ApiPropertyOptional()
  videoThumbnailUri: string;

  @ApiPropertyOptional({ example: '0:45' })
  videoDuration: string;

  @ApiPropertyOptional()
  video_url: string;

  @ApiPropertyOptional()
  cover_image_url: string;

  @ApiPropertyOptional({ type: Object, example: [{ position: 1, title: 'Paso 1' }] })
  guideSteps: { position: number; title: string; description?: string; image_url?: string }[];

  @ApiProperty()
  is_active: boolean;
}