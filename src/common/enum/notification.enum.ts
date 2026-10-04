/**
 * Categorías de notificación, copiadas de `CATEGORY_STYLES`
 * (src/screens/private/NotificationsScreen.tsx). La app las usa para elegir
 * ícono y color, no como un enum cerrado, pero se persiste como enum para
 * poder filtrar.
 */
export enum NotificationCategory {
  PROGRESS = 'PROGRESO',
  ACHIEVEMENT = 'LOGRO',
  EXERCISE = 'EJERCICIO',
  REMINDER = 'RECORDATORIO',
  DEVICE = 'DISPOSITIVO',
  GOAL = 'META',
  MESSAGE = 'MENSAJE',
  GENERAL = 'GENERAL',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
}