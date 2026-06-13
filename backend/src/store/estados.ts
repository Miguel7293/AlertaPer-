// Canonical estado descriptions used to seed the `estado` lookup table and to
// resolve estado_id transitions (the schema's estado table has only id + descripcion).
export const ESTADOS = {
  RECIBIDA: 'Recibida',
  IDENTIDAD_PENDIENTE: 'Pendiente de verificación de identidad',
  EN_REVISION: 'En revisión',
  ASIGNADA: 'Asignada',
  INFO_REQUERIDA: 'Información adicional requerida',
  EN_INVESTIGACION: 'En investigación',
  RESUELTA: 'Resuelta',
  OBSERVADA: 'Observada',
} as const;

export const ESTADO_LIST = Object.values(ESTADOS);
