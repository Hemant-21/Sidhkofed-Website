/**
 * Video routes — `/api/v1/admin/videos/*`. Create/edit: Super Admin, Content Editor,
 * Publisher. Lifecycle: Super Admin + Publisher (API spec §8).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { videoController } from './video.controller';

const editors = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const publishers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];

export const videoRouter = Router();

videoRouter.param('id', uuidParam); // 422 for malformed :id (Issue 9)
videoRouter.use(authenticate);

videoRouter.post('/validate-url', authorize(editors), videoController.validateUrl);
videoRouter.get('/', authorize(editors), videoController.list);
videoRouter.post('/', authorize(editors), videoController.create);
videoRouter.get('/:id', authorize(editors), videoController.detail);
videoRouter.patch('/:id', authorize(editors), videoController.patch);

videoRouter.post('/:id/publish', authorize(publishers), videoController.publish);
videoRouter.post('/:id/unpublish', authorize(publishers), videoController.unpublish);
videoRouter.post('/:id/archive', authorize(publishers), videoController.archive);
videoRouter.post('/:id/restore', authorize(publishers), videoController.restore);
