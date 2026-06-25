/**
 * Gallery routes — `/api/v1/admin/galleries/*`. Create/edit/images: Super Admin,
 * Content Editor, Publisher. Lifecycle actions: Super Admin + Publisher (editors cannot
 * publish/archive) — API spec §8 RBAC matrix.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { galleryController } from './gallery.controller';

// Writes/lifecycle permission-checked against the generic `content.*` set (remediation Issue 5);
// reads stay role-based (no `content.view` permission). Super Admin bypasses. Create =
// `content.create OR content.update` preserves pre-remediation behaviour.
const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const createWrite = ['content.create', 'content.update'];

export const galleryRouter = Router();

galleryRouter.param('id', uuidParam); // 422 for malformed :id (Issue 9)
galleryRouter.param('imageId', uuidParam);
galleryRouter.use(authenticate);

galleryRouter.get('/', authorize(readers), galleryController.list);
galleryRouter.post('/', authorizeAnyPermission(createWrite), galleryController.create);
galleryRouter.get('/:id', authorize(readers), galleryController.detail);
galleryRouter.patch('/:id', authorizePermissions(['content.update']), galleryController.patch);

galleryRouter.post('/:id/publish', authorizePermissions(['content.publish']), galleryController.publish);
galleryRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), galleryController.unpublish);
galleryRouter.post('/:id/archive', authorizePermissions(['content.archive']), galleryController.archive);
galleryRouter.post('/:id/restore', authorizePermissions(['content.restore']), galleryController.restore);

galleryRouter.post('/:id/images', authorizeAnyPermission(createWrite), galleryController.addImage);
galleryRouter.post('/:id/images/reorder', authorizeAnyPermission(createWrite), galleryController.reorder);
galleryRouter.patch('/:id/images/:imageId', authorizePermissions(['content.update']), galleryController.updateImage);
galleryRouter.delete('/:id/images/:imageId', authorizePermissions(['content.update']), galleryController.removeImage);
