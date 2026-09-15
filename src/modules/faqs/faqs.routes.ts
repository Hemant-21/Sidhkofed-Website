/**
 * FAQ routes.
 *   /api/v1/admin/faqs/*  — authenticated; create/update/view = Super Admin + Content Editor +
 *                           Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/faqs   — unauthenticated; published only; page_key + search filters.
 *
 * Authorization reuses the shared role/permission middleware exactly like tenders/pages.
 * Logical `faqs.*` keys are documented in faqs.permissions.ts; no RBAC schema change.
 *
 * `/pages` and `/pages/:pageKey/reorder` are registered BEFORE `/:id` — otherwise Express would
 * match `/pages` against the `:id` route first and `uuidParam` would reject "pages" as an invalid
 * UUID before the real handler ever runs.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { faqController } from './faqs.controller';
import { faqPublicController } from './faqs.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const faqAdminRouter = Router();
faqAdminRouter.param('id', uuidParam);
faqAdminRouter.use(authenticate);

faqAdminRouter.get('/pages', authorize(readers), faqController.pages);
faqAdminRouter.post('/pages/:pageKey/reorder', authorizePermissions(['content.update']), faqController.reorderPage);

faqAdminRouter.get('/', authorize(readers), faqController.list);
faqAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), faqController.create);
faqAdminRouter.get('/:id', authorize(readers), faqController.detail);
faqAdminRouter.patch('/:id', authorizePermissions(['content.update']), faqController.patch);

faqAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), faqController.publish);
faqAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), faqController.unpublish);
faqAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), faqController.archive);
faqAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), faqController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const faqPublicRouter = Router();
faqPublicRouter.get('/', faqPublicController.list);
