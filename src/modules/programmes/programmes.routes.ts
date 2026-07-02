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
import { PROGRAMME_PERMISSIONS as P } from './programmes.permissions';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const programmeAdminRouter = Router();
programmeAdminRouter.param('id', uuidParam);
programmeAdminRouter.use(authenticate);

programmeAdminRouter.get('/', authorize(readers), programmeController.list);
programmeAdminRouter.post('/', authorizeAnyPermission([P.create, P.update]), programmeController.create);
programmeAdminRouter.get('/:id', authorize(readers), programmeController.detail);
programmeAdminRouter.patch('/:id', authorizePermissions([P.update]), programmeController.patch);

programmeAdminRouter.post('/:id/publish', authorizePermissions([P.publish]), programmeController.publish);
programmeAdminRouter.post('/:id/unpublish', authorizePermissions([P.unpublish]), programmeController.unpublish);
programmeAdminRouter.post('/:id/archive', authorizePermissions([P.archive]), programmeController.archive);
programmeAdminRouter.post('/:id/restore', authorizePermissions([P.restore]), programmeController.restore);

export const programmePublicRouter = Router();
programmePublicRouter.get('/', programmePublicController.list);
programmePublicRouter.get('/:slug', programmePublicController.detail);
