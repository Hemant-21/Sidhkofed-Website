/**
 * Menu routes.
 *   /api/v1/admin/menu-items/*  — authenticated.
 *       GET (view)                       = Super Admin + Content Editor + Publisher
 *       POST / PATCH / reorder           = content.create / content.update (Editor when granted,
 *                                          Publisher, Super Admin)
 *       DELETE                           = Super Admin ONLY (cascades children; requires confirm)
 *   /api/v1/public/menus?location=*  — unauthenticated; nested active tree.
 *
 * Authorization reuses the shared role/permission middleware; logical `menus.*` keys are documented
 * in menus.permissions.ts. No RBAC schema change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { menuController } from './menus.controller';
import { menuPublicController } from './menus.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const menuAdminRouter = Router();
menuAdminRouter.param('id', uuidParam);
menuAdminRouter.use(authenticate);

menuAdminRouter.get('/', authorize(readers), menuController.list);
menuAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), menuController.create);
// `reorder` is a fixed path — declare it before the `/:id` routes so it is not shadowed.
menuAdminRouter.post('/reorder', authorizePermissions(['content.update']), menuController.reorder);
menuAdminRouter.get('/:id', authorize(readers), menuController.detail);
menuAdminRouter.patch('/:id', authorizePermissions(['content.update']), menuController.patch);
menuAdminRouter.delete('/:id', authorize([ROLE_KEYS.superAdmin]), menuController.remove);

// ── Public ──────────────────────────────────────────────────────────────────────
export const menuPublicRouter = Router();
menuPublicRouter.get('/', menuPublicController.tree);
