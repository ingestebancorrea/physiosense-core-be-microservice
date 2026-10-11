/**
 * Mensajes informativos que viajan en el cuerpo de una respuesta exitosa.
 *
 * A diferencia de `ErrorMessages` (errores de runtime) y `SwaggerMessages`
 * (solo documentación), este enum se usa cuando la operación fue correcta pero
 * no hay datos que devolver, para que la app pueda pintar un texto claro en vez
 * de una lista vacía sin contexto.
 */
export enum ResponseMessages {
  NO_PATIENTS_ASSIGNED = 'No tienes pacientes asignados',
}
