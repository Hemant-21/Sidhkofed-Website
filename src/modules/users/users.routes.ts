/**
 * User routes.
 *   /api/v1/admin/users/*    — authenticated; ALL operations require `users.manage`
 *                              (Super Admin only by default — Content Editor / Publisher are
 *                              blocked). Covers list/detail/create/update/password/status.
 *   /api/v1/admin/profile*   — authenticated; ANY signed-in user edits their OWN profile/password.
 *
 * Authorization reuses the shared role/permission middleware exactly like the content modules. The
 * `users.manage` permission is already seeded (auth.permissions.ts); no RBAC schema change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { USER_PERMISSIONS } from './users.permissions';
import { userController } from './users.controller';

const manage = authorizePermissions([USER_PERMISSIONS.manage]);

// ── Admin user management (mounted at /admin/users) ────────────────────────────
export const userAdminRouter = Router();
userAdminRouter.param('id', uuidParam);
userAdminRouter.use(authenticate);

userAdminRouter.get('/', manage, userController.list);
userAdminRouter.post('/', manage, userController.create);
userAdminRouter.get('/:id', manage, userController.detail);
userAdminRouter.patch('/:id', manage, userController.patch);
userAdminRouter.patch('/:id/password', manage, userController.password);
userAdminRouter.patch('/:id/status', manage, userController.status);

// ── Self-service profile (mounted at /admin/profile) ───────────────────────────
export const profileRouter = Router();
profileRouter.use(authenticate);

profileRouter.patch('/', userController.profileUpdate);
profileRouter.patch('/password', userController.profilePassword);
