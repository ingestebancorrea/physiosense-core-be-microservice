/**
 * Textos usados en los `@ApiResponse` para documentar las respuestas de los
 * controladores en Swagger.
 *
 * Es distinto de `ErrorMessages`: ese enum es el que viaja en el cuerpo de la
 * respuesta en runtime; este solo documenta. Se mantienen separados para que
 * cambiar un mensaje de error no altere la documentación ni viceversa.
 */
export enum SwaggerMessages {
  BAD_REQUEST = 'Solicitud inválida',
  MISSING_TOKEN = 'Falta el token de autorización',
  NOT_VALID_TOKEN = 'Token no válido o expirado',
  FORBIDDEN_ROLE = 'El usuario no tiene permisos para realizar esta acción',
  NOT_FOUND = 'Recurso no encontrado',
  PATIENT_NOT_FOUND = 'El paciente no existe',
  THERAPIST_NOT_FOUND = 'El fisioterapeuta no existe',
  DUPLICATED_RESOURCE = 'El recurso ya existe',
  AUTH_SERVICE_UNAVAILABLE = 'El servicio de autenticación no está disponible',
  INTERNAL_SERVER_ERROR = 'Error interno del servidor',
}
