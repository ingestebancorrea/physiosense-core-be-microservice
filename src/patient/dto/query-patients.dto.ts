import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PatientStatus } from '../entities/patient.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryPatientsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: PatientStatus,
    description: 'Equivale a los filtros Activos / Inactivos de la app',
  })
  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @ApiPropertyOptional({
    description: 'Busca por nombre o por id, sin distinguir mayúsculas',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Filtra por el fisioterapeuta asignado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  therapist_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  include_inactive?: boolean;
}