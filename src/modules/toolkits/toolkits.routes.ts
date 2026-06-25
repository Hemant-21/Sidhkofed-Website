/**
 * Toolkit routes.
 *   /api/v1/admin/toolkits/*               — authenticated; create/update/view = all CMS roles;
 *                                            lifecycle = Super Admin + Publisher.
 *   /api/v1/admin/toolkits/{id}/items/*    — nested catalogue items (content.create/update).
 *   /api/v1/public/toolkits/*              — unauthenticated; published only.
 *   /api/v1/public/toolkits/{slug}/distribution-summary — aggregated per-event summary figures.
 *
 * Authorization reuses the shared role/permission middleware (the seeded `content.*` grants);
 * no new RBAC system.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { toolkitController } from './toolkits.controller';
import { toolkitPublicController } from './toolkits.public.controller';
import { toolkitItemController } from './items/items.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const toolkitAdminRouter = Router();
toolkitAdminRouter.param('id', uuidParam);
toolkitAdminRouter.param('item_id', uuidParam);
toolkitAdminRouter.use(authenticate);

// ── Toolkit aggregate root ──────────────────────────────────────────────────────
toolkitAdminRouter.get('/', authorize(readers), toolkitController.list);
toolkitAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), toolkitController.create);
toolkitAdminRouter.get('/:id', authorize(readers), toolkitController.detail);
toolkitAdminRouter.patch('/:id', authorizePermissions(['content.update']), toolkitController.patch);

toolkitAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), toolkitController.publish);
toolkitAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), toolkitController.unpublish);
toolkitAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), toolkitController.archive);
toolkitAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), toolkitController.restore);

// ── Nested toolkit items ──────────────────────────────────────────────────────
toolkitAdminRouter.get('/:id/items', authorize(readers), toolkitItemController.list);
toolkitAdminRouter.post('/:id/items', authorizeAnyPermission(['content.create', 'content.update']), toolkitItemController.create);
toolkitAdminRouter.get('/:id/items/:item_id', authorize(readers), toolkitItemController.detail);
toolkitAdminRouter.patch('/:id/items/:item_id', authorizePermissions(['content.update']), toolkitItemController.patch);
toolkitAdminRouter.delete('/:id/items/:item_id', authorizePermissions(['content.update']), toolkitItemController.remove);

// ── Public ──────────────────────────────────────────────────────────────────────
export const toolkitPublicRouter = Router();
toolkitPublicRouter.get('/', toolkitPublicController.list);
toolkitPublicRouter.get('/:slug', toolkitPublicController.detail);
toolkitPublicRouter.get('/:slug/distribution-summary', toolkitPublicController.distributionSummary);
