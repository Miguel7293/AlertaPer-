// Niveles de servidor_publico. El `slug` viaja en el JWT y se usa para autorizar;
// la `descripcion` es el nombre legible guardado en la tabla `roles`.
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ENCARGADO_COMISARIA: 'encargado_comisaria',
  POLICIA: 'policia',
  FISCAL: 'fiscal',
} as const;

export type RolSlug = (typeof ROLES)[keyof typeof ROLES];

export const ROL_DESCRIPCION: Record<RolSlug, string> = {
  super_admin: 'Super Administrador',
  encargado_comisaria: 'Encargado de Comisaría',
  policia: 'Policía',
  fiscal: 'Fiscal',
};

// descripcion (en BD) -> slug (en código/JWT)
export const SLUG_POR_DESCRIPCION: Record<string, string> = Object.fromEntries(
  Object.entries(ROL_DESCRIPCION).map(([slug, desc]) => [desc, slug]),
);
