/**
 * Ciclo de vida de una sesión de tratamiento.
 *
 * La app movil usa hoy cuatro vocabularios distintos para el mismo concepto y
 * no hay traducción entre ellos:
 *
 *   types/session.ts        'Activa' | 'Programada' | 'Borrador' | 'Completada'
 *   types/progress.ts       'completed' | 'in_progress' | 'cancelled'
 *   types/progress.ts       'Completada' | 'Pendiente' | 'Incompleta'  (SessionDetail)
 *   types/dashboard.ts      'completed' | 'in_progress' | 'cancelled'  (LastSession)
 *
 * Acá se persiste un unico vocabulario canónico en mayúsculas y se expone la
 * etiqueta en español que cada pantalla ya sabe pintar, de modo que el cliente
 * no tenga que seguir adivinando.
 */
export enum SessionStatus {
  /** Creada por el fisioterapeuta pero todavía no publicada al paciente. */
  DRAFT = 'DRAFT',
  /** Publicada con fecha futura; el paciente todavía no la empezó. */
  SCHEDULED = 'SCHEDULED',
  /** El paciente la tiene en curso con el guante conectado. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** El paciente la terminó y hay datos de ejecución. */
  COMPLETED = 'COMPLETED',
  /** El paciente o el fisioterapeuta la dio por baja. */
  CANCELLED = 'CANCELLED',
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  [SessionStatus.DRAFT]: 'Borrador',
  [SessionStatus.SCHEDULED]: 'Programada',
  [SessionStatus.IN_PROGRESS]: 'Activa',
  [SessionStatus.COMPLETED]: 'Completada',
  [SessionStatus.CANCELLED]: 'Cancelada',
};

/**
 * Traducción de los valores literales que la app móvil ya tenía hardcodeados,
 * para que un cliente viejo pueda seguir enviando los que usaba.
 */
export const SESSION_STATUS_ALIAS: Record<string, SessionStatus> = {
  Borrador: SessionStatus.DRAFT,
  Programada: SessionStatus.SCHEDULED,
  Activa: SessionStatus.IN_PROGRESS,
  Completada: SessionStatus.COMPLETED,
  Cancelada: SessionStatus.CANCELLED,
  Pendiente: SessionStatus.SCHEDULED,
  Incompleta: SessionStatus.IN_PROGRESS,
  draft: SessionStatus.DRAFT,
  scheduled: SessionStatus.SCHEDULED,
  in_progress: SessionStatus.IN_PROGRESS,
  completed: SessionStatus.COMPLETED,
  cancelled: SessionStatus.CANCELLED,
};

/**
 * Estados considered "terminales": la sesión ya no vuelve a la lista de activas.
 */
export const CLOSED_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
];