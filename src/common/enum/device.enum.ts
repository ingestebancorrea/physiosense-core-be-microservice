/**
 * Estado del guante Smart Glove.
 *
 * La app móvil declara este mismo conjunto dos veces: `GloveConnectionState`
 * (types/preparation.ts) y `DeviceStatus` (screens/private/DevicesScreen.tsx),
 * con exactamente los mismos tres miembros. Se unifican acá.
 */
export enum DeviceStatus {
  CONNECTED = 'CONNECTED',
  CONNECTING = 'CONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  [DeviceStatus.CONNECTED]: 'Conectado',
  [DeviceStatus.CONNECTING]: 'Conectando',
  [DeviceStatus.DISCONNECTED]: 'Desconectado',
};

/** Nombre comercial del dispositivo. */
export const SMART_GLOVE_NAME = 'Smart Glove';