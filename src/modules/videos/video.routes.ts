/**
 * Video routes — `/api/v1/admin/videos/*`. Create/edit: Super Admin, Content Editor,
 * Publisher. Lifecycle: Super Admin + Publisher (API spec §8).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { videoController } from './video.controller';

// Writes/lifecycle permission-checked against the generic `content.*` set (remediation Issue 5);
// reads (+ the stateless validate-url helper) stay role-based (no `content.view` permission).
// Super Admin bypasses. Create = `content.create OR content.update` preserves prior behaviour.
const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const videoRouter = Router();

videoRouter.param('id', uuidParam); // 422 for malformed :id (Issue 9)
videoRouter.use(authenticate);

videoRouter.post('/validate-url', authorize(readers), videoController.validateUrl);
videoRouter.get('/', authorize(readers), videoController.list);
videoRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), videoController.create);
videoRouter.get('/:id', authorize(readers), videoController.detail);
videoRouter.patch('/:id', authorizePermissions(['content.update']), videoController.patch);

videoRouter.post('/:id/publish', authorizePermissions(['content.publish']), videoController.publish);
videoRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), videoController.unpublish);
videoRouter.post('/:id/archive', authorizePermissions(['content.archive']), videoController.archive);
videoRouter.post('/:id/restore', authorizePermissions(['content.restore']), videoController.restore);
