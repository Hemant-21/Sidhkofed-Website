/**
 * Audit service compatibility shim.
 *
 * The audit system now lives in `src/modules/audit` (Phase 3, TASK 3). This file is kept
 * so existing importers (e.g. the auth module's `@/services/audit`) keep resolving to the
 * single centralized service. New code should import from `@/modules/audit`.
 */
export { auditService } from '@/modules/audit/audit.service';
