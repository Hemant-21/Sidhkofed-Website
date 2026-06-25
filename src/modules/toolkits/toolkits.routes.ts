/**
 * Toolkit routes.
 *   /api/v1/admin/toolkits/*               — authenticated; create/update/view = all CMS roles;
 *                                            lifecycle = Super Admin + Publisher.
 *   /api/v1/admin/toolkits/{id}/items/*    — nested catalogue items (toolkit_items.* CRUD).
 *   /api/v1/public/toolkits/*              — unauthenticated; published only.
 *   /api/v1/public/toolkits/{slug}/distribution-summary — aggregated per-event summary figures.
 *
 * Authorization enforces module-specific permissions (`toolkits.*` / `toolkit_items.*`);
 * Super Admin bypasses.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { toolkitController } from './toolkits.controller';
import { toolkitPublicController } from './toolkits.public.controller';
import { toolkitItemController } from './items/items.controller';
import { TOOLKIT_PERMISSIONS as T, TOOLKIT_ITEM_PERMISSIONS as TI } from './toolkits.permissions';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const toolkitAdminRouter = Router();
toolkitAdminRouter.param('id', uuidParam);
toolkitAdminRouter.param('item_id', uuidParam);
toolkitAdminRouter.use(authenticate);

// ── Toolkit aggregate root ──────────────────────────────────────────────────────
toolkitAdminRouter.get('/', authorize(readers), toolkitController.list);
toolkitAdminRouter.post('/', authorizeAnyPermission([T.create, T.update]), toolkitController.create);
toolkitAdminRouter.get('/:id', authorize(readers), toolkitController.detail);
toolkitAdminRouter.patch('/:id', authorizePermissions([T.update]), toolkitController.patch);

toolkitAdminRouter.post('/:id/publish', authorizePermissions([T.publish]), toolkitController.publish);
toolkitAdminRouter.post('/:id/unpublish', authorizePermissions([T.unpublish]), toolkitController.unpublish);
toolkitAdminRouter.post('/:id/archive', authorizePermissions([T.archive]), toolkitController.archive);
toolkitAdminRouter.post('/:id/restore', authorizePermissions([T.restore]), toolkitController.restore);

// ── Nested toolkit items ──────────────────────────────────────────────────────
toolkitAdminRouter.get('/:id/items', authorize(readers), toolkitItemController.list);
toolkitAdminRouter.post('/:id/items', authorizeAnyPermission([TI.create, TI.update]), toolkitItemController.create);
toolkitAdminRouter.get('/:id/items/:item_id', authorize(readers), toolkitItemController.detail);
toolkitAdminRouter.patch('/:id/items/:item_id', authorizePermissions([TI.update]), toolkitItemController.patch);
toolkitAdminRouter.delete('/:id/items/:item_id', authorizePermissions([TI.delete]), toolkitItemController.remove);

// ── Public ──────────────────────────────────────────────────────────────────────
export const toolkitPublicRouter = Router();
toolkitPublicRouter.get('/', toolkitPublicController.list);
toolkitPublicRouter.get('/:slug', toolkitPublicController.detail);
toolkitPublicRouter.get('/:slug/distribution-summary', toolkitPublicController.distributionSummary);
