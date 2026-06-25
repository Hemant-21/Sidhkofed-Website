/**
 * Programme routes.
 *   /api/v1/admin/programmes/*  — authenticated; create/update/view = all CMS roles;
 *                                 lifecycle = Super Admin + Publisher.
 *   /api/v1/public/programmes/* — unauthenticated; published only.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { programmeController } from './programmes.controller';
import { programmePublicController } from './programmes.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const programmeAdminRouter = Router();
programmeAdminRouter.param('id', uuidParam);
programmeAdminRouter.use(authenticate);

programmeAdminRouter.get('/', authorize(readers), programmeController.list);
programmeAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), programmeController.create);
programmeAdminRouter.get('/:id', authorize(readers), programmeController.detail);
programmeAdminRouter.patch('/:id', authorizePermissions(['content.update']), programmeController.patch);

programmeAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), programmeController.publish);
programmeAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), programmeController.unpublish);
programmeAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), programmeController.archive);
programmeAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), programmeController.restore);

export const programmePublicRouter = Router();
programmePublicRouter.get('/', programmePublicController.list);
programmePublicRouter.get('/:slug', programmePublicController.detail);
