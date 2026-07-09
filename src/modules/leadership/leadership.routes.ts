/**
 * Leadership routes.
 *   /api/v1/admin/leadership/*  — authenticated; create/update/view = Super Admin + Content
 *                                 Editor + Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/leadership   — unauthenticated; published only (this IS the homepage feed).
 *
 * Authorization reuses the shared role/permission middleware exactly like digital-services/tenders/
 * pages/faqs. Logical `leadership.*` keys are documented in leadership.permissions.ts; no RBAC change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { leadershipController } from './leadership.controller';
import { leadershipPublicController } from './leadership.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const leadershipAdminRouter = Router();
leadershipAdminRouter.param('id', uuidParam);
leadershipAdminRouter.use(authenticate);

leadershipAdminRouter.get('/', authorize(readers), leadershipController.list);
leadershipAdminRouter.post(
  '/',
  authorizeAnyPermission(['content.create', 'content.update']),
  leadershipController.create,
);
leadershipAdminRouter.get('/:id', authorize(readers), leadershipController.detail);
leadershipAdminRouter.patch('/:id', authorizePermissions(['content.update']), leadershipController.patch);

leadershipAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), leadershipController.publish);
leadershipAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), leadershipController.unpublish);
leadershipAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), leadershipController.archive);
leadershipAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), leadershipController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const leadershipPublicRouter = Router();
leadershipPublicRouter.get('/', leadershipPublicController.list);
