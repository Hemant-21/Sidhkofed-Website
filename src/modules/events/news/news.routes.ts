/**
 * Event News routes.
 *   /api/v1/admin/news/*  — authenticated; view = all CMS roles; PATCH = content.update;
 *                           lifecycle (publish/unpublish/archive[=remove from news]/restore) =
 *                           Super Admin + Publisher.
 *   /api/v1/public/news/* — unauthenticated; published only.
 * (Creation is via POST /admin/events/{id}/publish-as-news — see events.routes.ts.)
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { newsController } from './news.controller';
import { newsPublicController } from './news.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const newsAdminRouter = Router();
newsAdminRouter.param('id', uuidParam);
newsAdminRouter.use(authenticate);

newsAdminRouter.get('/', authorize(readers), newsController.list);
newsAdminRouter.get('/:id', authorize(readers), newsController.detail);
newsAdminRouter.patch('/:id', authorizePermissions(['content.update']), newsController.patch);
newsAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), newsController.publish);
newsAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), newsController.unpublish);
newsAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), newsController.archive);
newsAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), newsController.restore);

export const newsPublicRouter = Router();
newsPublicRouter.get('/', newsPublicController.list);
newsPublicRouter.get('/:slug', newsPublicController.detail);
