/**
 * Page routes.
 *   /api/v1/admin/pages/*  — authenticated; create/update/view = Super Admin + Content Editor +
 *                            Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/pages/* — unauthenticated; detail-by-slug, published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like tenders/documents.
 * Logical `pages.*` keys are documented in pages.permissions.ts; no RBAC schema change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { pageController } from './pages.controller';
import { pagePublicController } from './pages.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const pageAdminRouter = Router();
pageAdminRouter.param('id', uuidParam);
pageAdminRouter.use(authenticate);

pageAdminRouter.get('/', authorize(readers), pageController.list);
pageAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), pageController.create);
pageAdminRouter.get('/:id', authorize(readers), pageController.detail);
pageAdminRouter.patch('/:id', authorizePermissions(['content.update']), pageController.patch);

pageAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), pageController.publish);
pageAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), pageController.unpublish);
pageAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), pageController.archive);
pageAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), pageController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const pagePublicRouter = Router();
pagePublicRouter.get('/:slug', pagePublicController.detail);
