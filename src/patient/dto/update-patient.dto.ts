import { PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';

/**
 * Actualización parcial del paciente.
 *
 * `user_id` se excluye a propósito: cambiar el vínculo con la cuenta de
 * autenticación no es una operación de este servicio.
 */
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}