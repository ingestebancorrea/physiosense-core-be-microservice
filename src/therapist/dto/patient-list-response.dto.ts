import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientListItemResponseDto } from './patient-list-item-response.dto';

/**
 * Respuesta del listado "mis pacientes".
 *
 * `message` solo viene cargado cuando no hay resultados (por ejemplo
 * `ResponseMessages.NO_PATIENTS_ASSIGNED`); en una lista con datos queda en
 * null para no repetir un texto en cada fila. `items` siempre es un arreglo.
 */
export class PatientListResponseDto {
  @ApiPropertyOptional({
    example: 'No tienes pacientes asignados',
    description: 'Mensaje informativo; null cuando hay resultados',
  })
  message: string | null;

  @ApiProperty({ type: [PatientListItemResponseDto] })
  items: PatientListItemResponseDto[];
}
