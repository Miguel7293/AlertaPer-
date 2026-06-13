import { Logger } from '@nestjs/common';

// Lightweight audit trail. The proposed schema has no audit_log table, so for now
// audit events are logged. For production, add an audit_log table and persist here.
const logger = new Logger('Audit');

export function audit(
  actor: string,
  accion: string,
  entidad: string,
  entidadId: string,
  _meta: Record<string, unknown> = {},
) {
  logger.log(`${accion} · ${entidad}:${entidadId} · actor=${actor}`);
}
