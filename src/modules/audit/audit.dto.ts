/**
 * Audit response DTO + mapper (read-only API). snake_case per the envelope contract.
 */
import type { AuditRow } from './audit.repository';

export interface AuditLogDto {
  id: string;
  action: string;
  /** The precise semantic event (e.g. LOGIN_SUCCESS, MEDIA_UPLOAD), from metadata/summary. */
  event: string | null;
  module: string;
  record_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  change_summary: string | null;
  metadata: unknown;
  user: { id: string; email: string; full_name: string } | null;
  created_at: string;
}

export function toAuditLogDto(row: AuditRow): AuditLogDto {
  const metadata = (row.metadata ?? null) as Record<string, unknown> | null;
  const event = metadata && typeof metadata.event === 'string' ? metadata.event : row.changeSummary;
  return {
    id: row.id,
    action: row.action,
    event,
    module: row.module,
    record_id: row.recordId,
    previous_state: row.previousState,
    new_state: row.newState,
    change_summary: row.changeSummary,
    metadata: row.metadata ?? null,
    user: row.user ? { id: row.user.id, email: row.user.email, full_name: row.user.fullName } : null,
    created_at: row.createdAt.toISOString(),
  };
}
