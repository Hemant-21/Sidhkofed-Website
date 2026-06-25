/**
 * Procurement Update routes.
 *   /api/v1/admin/procurement-updates/*  — authenticated; create/update/view = Super Admin + Content
 *                                          Editor + Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/procurement-updates/* — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like documents/institutions.
 * Logical `procurement-updates.*` keys are documented in procurement-updates.permissions.ts; no RBAC
 * schema change (development-rules §3).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { procurementUpdateController } from './procurement-updates.controller';
import { procurementUpdatePublicController } from './procurement-updates.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const procurementUpdateAdminRouter = Router();
procurementUpdateAdminRouter.param('id', uuidParam);
procurementUpdateAdminRouter.use(authenticate);

procurementUpdateAdminRouter.get('/', authorize(readers), procurementUpdateController.list);
procurementUpdateAdminRouter.post(
  '/',
  authorizeAnyPermission(['content.create', 'content.update']),
  procurementUpdateController.create,
);
procurementUpdateAdminRouter.get('/:id', authorize(readers), procurementUpdateController.detail);
procurementUpdateAdminRouter.patch('/:id', authorizePermissions(['content.update']), procurementUpdateController.patch);

procurementUpdateAdminRouter.post(
  '/:id/publish',
  authorizePermissions(['content.publish']),
  procurementUpdateController.publish,
);
procurementUpdateAdminRouter.post(
  '/:id/unpublish',
  authorizePermissions(['content.unpublish']),
  procurementUpdateController.unpublish,
);
procurementUpdateAdminRouter.post(
  '/:id/archive',
  authorizePermissions(['content.archive']),
  procurementUpdateController.archive,
);
procurementUpdateAdminRouter.post(
  '/:id/restore',
  authorizePermissions(['content.restore']),
  procurementUpdateController.restore,
);

// ── Public ──────────────────────────────────────────────────────────────────────
export const procurementUpdatePublicRouter = Router();
procurementUpdatePublicRouter.get('/', procurementUpdatePublicController.list);
procurementUpdatePublicRouter.get('/:slug', procurementUpdatePublicController.detail);
