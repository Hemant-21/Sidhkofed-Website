/**
 * Masters routes.
 *   /api/v1/admin/masters/*  — authenticated; reads are dropdown access for every CMS role,
 *                              writes/activation are permission-gated (Super Admin wildcard).
 *   /api/v1/public/masters/* — unauthenticated; active records only (API spec §4/§5/§8).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { MASTER_PERMISSIONS } from './masters.permissions';
import { mastersController } from './masters.controller';

// ── Admin ─────────────────────────────────────────────────────────────────
export const mastersAdminRouter = Router();
// `:id` must be a UUID → 422 not 500 (Issue 9). `:master_key` is a route key, not a UUID,
// and is validated by the registry lookup (404 on an unknown master).
mastersAdminRouter.param('id', uuidParam);
mastersAdminRouter.use(authenticate);

mastersAdminRouter.get('/:master_key', authorizePermissions([MASTER_PERMISSIONS.view]), mastersController.list);
mastersAdminRouter.post('/:master_key', authorizePermissions([MASTER_PERMISSIONS.create]), mastersController.create);
mastersAdminRouter.get('/:master_key/:id', authorizePermissions([MASTER_PERMISSIONS.view]), mastersController.detail);
mastersAdminRouter.patch('/:master_key/:id', authorizePermissions([MASTER_PERMISSIONS.update]), mastersController.patch);
mastersAdminRouter.post(
  '/:master_key/:id/activate',
  authorizePermissions([MASTER_PERMISSIONS.activate]),
  mastersController.activate,
);
mastersAdminRouter.post(
  '/:master_key/:id/deactivate',
  authorizePermissions([MASTER_PERMISSIONS.deactivate]),
  mastersController.deactivate,
);

// ── Public ────────────────────────────────────────────────────────────────
export const mastersPublicRouter = Router();
mastersPublicRouter.get('/:master_key', mastersController.publicList);
