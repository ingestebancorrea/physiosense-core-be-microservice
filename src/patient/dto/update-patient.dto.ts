import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';

/**
 * Actualizacion parcial de la ficha clinica.
 *
 * `patient_id` se excluye a proposito: re-apuntar la ficha a otro paciente de
 * auth no es una operacion de este servicio (se crea otra ficha en su lugar).
 */
export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['patient_id'] as const),
) {}
