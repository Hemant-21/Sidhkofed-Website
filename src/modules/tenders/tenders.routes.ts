/**
 * Tender routes.
 *   /api/v1/admin/tenders/*  — authenticated; create/update/view = Super Admin + Content Editor +
 *                              Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/tenders/* — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like documents/institutions.
 * Logical `tenders.*` keys are documented in tenders.permissions.ts; no RBAC schema change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { tenderController } from './tenders.controller';
import { tenderPublicController } from './tenders.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const tenderAdminRouter = Router();
tenderAdminRouter.param('id', uuidParam);
tenderAdminRouter.use(authenticate);

tenderAdminRouter.get('/', authorize(readers), tenderController.list);
tenderAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), tenderController.create);
tenderAdminRouter.get('/:id', authorize(readers), tenderController.detail);
tenderAdminRouter.patch('/:id', authorizePermissions(['content.update']), tenderController.patch);

tenderAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), tenderController.publish);
tenderAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), tenderController.unpublish);
tenderAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), tenderController.archive);
tenderAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), tenderController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const tenderPublicRouter = Router();
tenderPublicRouter.get('/', tenderPublicController.list);
tenderPublicRouter.get('/:slug', tenderPublicController.detail);
