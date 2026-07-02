'use client';

/**
 * Audit Log data hooks. The audit log is a standard admin list/detail resource at
 * `/admin/audit-logs`, so it reuses the shared CRUD hooks against the `audit-logs` resource — there
 * is NO bespoke fetch logic. Audit has no create/update/lifecycle, so only the read hooks are used.
 *
 * Every call is gated by `enabled` because the endpoint is Super Admin only (API spec §8); other
 * roles must never trigger a 403. The list query is keyed by the validated filter object via the
 * shared query-key factory.
 */

import { useCrudDetail, useCrudList } from '@/hooks/crud';
import type { ListQuery } from '@/types/api';
import { AUDIT_RESOURCE, type AuditLogEntry } from './types';

/** Filtered, paginated audit list. Gate with `enabled` (Super Admin only). */
export function useAuditList(query: ListQuery, enabled = true) {
  return useCrudList<AuditLogEntry>(AUDIT_RESOURCE, query, { enabled, staleTime: 15_000 });
}

/** A single audit entry (read-only). */
export function useAuditDetail(id: string | undefined, enabled = true) {
  return useCrudDetail<AuditLogEntry>(AUDIT_RESOURCE, id, { enabled, staleTime: 60_000 });
}
