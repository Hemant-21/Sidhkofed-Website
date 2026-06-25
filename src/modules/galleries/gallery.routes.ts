/**
 * Gallery routes — `/api/v1/admin/galleries/*`. Create/edit/images: Super Admin,
 * Content Editor, Publisher. Lifecycle actions: Super Admin + Publisher (editors cannot
 * publish/archive) — API spec §8 RBAC matrix.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { galleryController } from './gallery.controller';

const editors = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const publishers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];

export const galleryRouter = Router();

galleryRouter.param('id', uuidParam); // 422 for malformed :id (Issue 9)
galleryRouter.param('imageId', uuidParam);
galleryRouter.use(authenticate);

galleryRouter.get('/', authorize(editors), galleryController.list);
galleryRouter.post('/', authorize(editors), galleryController.create);
galleryRouter.get('/:id', authorize(editors), galleryController.detail);
galleryRouter.patch('/:id', authorize(editors), galleryController.patch);

galleryRouter.post('/:id/publish', authorize(publishers), galleryController.publish);
galleryRouter.post('/:id/unpublish', authorize(publishers), galleryController.unpublish);
galleryRouter.post('/:id/archive', authorize(publishers), galleryController.archive);
galleryRouter.post('/:id/restore', authorize(publishers), galleryController.restore);

galleryRouter.post('/:id/images', authorize(editors), galleryController.addImage);
galleryRouter.post('/:id/images/reorder', authorize(editors), galleryController.reorder);
galleryRouter.patch('/:id/images/:imageId', authorize(editors), galleryController.updateImage);
galleryRouter.delete('/:id/images/:imageId', authorize(editors), galleryController.removeImage);
