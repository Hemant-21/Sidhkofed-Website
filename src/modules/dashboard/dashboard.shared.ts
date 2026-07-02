/**
 * Small cross-service helpers for the dashboard module: the single public-cache prefix (invalidated
 * on every admin write so published dashboard data stays fresh) and the authenticated-user guard
 * shared by the three services.
 */
import { ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import type { AuditContext } from '@/modules/audit/audit.service';

export const DASHBOARD_PUBLIC_CACHE_PREFIX = 'dashboard:public';

export async function invalidateDashboardCache(): Promise<void> {
  await cacheService.delByPrefix(`${DASHBOARD_PUBLIC_CACHE_PREFIX}:`);
}

export function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}
