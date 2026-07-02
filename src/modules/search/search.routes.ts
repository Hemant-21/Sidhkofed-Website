/**
 * Search routes (Phase 13).
 *   /api/v1/public/search — unauthenticated global metadata search (published/public records only).
 *   /api/v1/admin/search  — authenticated; same query contract over ALL publication states, gated to
 *                           the content-reader roles (Super Admin / Content Editor / Publisher).
 *
 * The public endpoint is the one defined by api-specification.md §5. The admin counterpart is an
 * additive, backward-compatible endpoint (foundation 06-development-rules §2 permits adding endpoints
 * without a version bump); it reuses the existing role-based `authorize()` middleware exactly like
 * every other admin module — no new authorization system.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { searchController } from './search.controller';
import { SEARCH_ADMIN_READERS } from './search.permissions';

// ── Public ──────────────────────────────────────────────────────────────────────
export const searchPublicRouter = Router();
searchPublicRouter.get('/', searchController.publicSearch);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const searchAdminRouter = Router();
searchAdminRouter.use(authenticate);
searchAdminRouter.get('/', authorize(SEARCH_ADMIN_READERS), searchController.adminSearch);
