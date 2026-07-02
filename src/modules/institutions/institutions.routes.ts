/**
 * Institution routes.
 *   /api/v1/admin/institutions/*  — authenticated; create/update/view = Super Admin + Content
 *                                   Editor + Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/institutions/* + /public/home/partners — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like documents/galleries/
 * videos. Logical `institutions.*` keys are documented in institutions.permissions.ts; no RBAC
 * schema change (development-rules §3).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { institutionController } from './institutions.controller';
import { institutionPublicController } from './institutions.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const institutionAdminRouter = Router();
institutionAdminRouter.param('id', uuidParam);
institutionAdminRouter.use(authenticate);

institutionAdminRouter.get('/', authorize(readers), institutionController.list);
institutionAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), institutionController.create);
institutionAdminRouter.get('/:id', authorize(readers), institutionController.detail);
institutionAdminRouter.patch('/:id', authorizePermissions(['content.update']), institutionController.patch);

institutionAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), institutionController.publish);
institutionAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), institutionController.unpublish);
institutionAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), institutionController.archive);
institutionAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), institutionController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const institutionPublicRouter = Router();
institutionPublicRouter.get('/', institutionPublicController.list);
institutionPublicRouter.get('/:slug', institutionPublicController.detail);

/** Mounted at /public/home/partners. */
export const homePartnersRouter = Router();
homePartnersRouter.get('/', institutionPublicController.homePartners);
