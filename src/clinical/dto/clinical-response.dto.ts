import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssessmentType,
  ClinicalRecordType,
} from 'src/common/enum/clinical.enum';

export class ClinicalRecordResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  patient_id: number;

  @ApiPropertyOptional()
  therapist_id: number;

  @ApiProperty({ enum: ClinicalRecordType })
  type: ClinicalRecordType;

  @ApiProperty({ example: 'Evolución', description: 'Etiqueta en español' })
  typeLabel: string;

  @ApiPropertyOptional()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  document_url: string;

  @ApiProperty()
  recordedAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class AssessmentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  patient_id: number;

  @ApiProperty()
  therapist_id: number;

  @ApiProperty({ enum: AssessmentType })
  type: AssessmentType;

  @ApiProperty({ example: 'Periódica' })
  typeLabel: string;

  @ApiPropertyOptional({ example: 3 })
  painScale: number;

  @ApiPropertyOptional({ example: 85 })
  romDegrees: number;

  @ApiPropertyOptional({ example: 12.5 })
  strengthNewtons: number;

  @ApiPropertyOptional({ example: 78.5 })
  score: number;

  @ApiPropertyOptional()
  notes: string;

  @ApiProperty({ example: true })
  is_completed: boolean;

  @ApiProperty()
  assessedAt: Date;
}
