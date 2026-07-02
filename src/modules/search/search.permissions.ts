/**
 * Search RBAC (Phase 13). Search introduces NO new permission and NO new authorization system
 * (foundation 06-development-rules §3 — reuse existing RBAC).
 *
 *   - Public search (`GET /public/search`) is unauthenticated and returns only published, publicly
 *     visible records (the visibility predicate is enforced in the repository).
 *   - Admin search (`GET /admin/search`) requires authentication and is restricted to the same roles
 *     that may read admin content (Super Admin, Content Editor, Publisher) — identical to the
 *     admin list/detail baseline in the RBAC matrix (api-specification.md §8). In this CMS every CMS
 *     role may read every content surface, so admin search spans all searchable surfaces; if per-module
 *     read restrictions are ever introduced, filter `SearchFilters.contentTypes` by the caller's grants
 *     before querying. Super Admin bypasses all checks via the shared `authorize` middleware.
 *
 * Search queries themselves never write `audit_logs` (Phase-13 brief).
 */
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';

/** Roles permitted to use admin global search — the shared content-reader baseline. */
export const SEARCH_ADMIN_READERS: string[] = [
  ROLE_KEYS.superAdmin,
  ROLE_KEYS.contentEditor,
  ROLE_KEYS.publisher,
];
