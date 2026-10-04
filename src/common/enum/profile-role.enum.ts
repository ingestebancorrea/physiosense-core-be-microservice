/**
 * Enums compartidos con authentication-be-microservice.
 *
 * `DominantHand` replica `dominant_hand_enum` de `profile-role.enum.ts` en el
 * servicio de autenticacion. Los valores persistidos deben coincidir
 * caracter por caracter: la app movil y los dos backends los comparan como
 * strings.
 */
export enum ProfileRoleAlias {
  PHYSIOTHERAPIST = 'FIS',
  PATIENT = 'PAC',
}

export enum DominantHand {
  RIGHT = 'Derecha',
  LEFT = 'Izquierda',
  AMBIDEXTROUS = 'Ambidiestro',
}