/**
 * Toolkit distribution routes — `/api/v1/admin/events/{event_id}/toolkit-distributions/*`.
 * Authenticated; view = all CMS roles; create/update/delete enforce the module-specific
 * `toolkit_distributions.*` permissions. Per-event training-level summary figures only. Mounted
 * at `/admin/events` alongside the events router (distinct path depth, so no route collision).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { toolkitDistributionController } from './toolkit-distributions.controller';
import { TOOLKIT_DISTRIBUTION_PERMISSIONS as D } from './toolkit-distributions.permissions';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

export const eventToolkitDistributionRouter = Router();
eventToolkitDistributionRouter.param('event_id', uuidParam);
eventToolkitDistributionRouter.param('id', uuidParam);
eventToolkitDistributionRouter.use(authenticate);

const base = '/:event_id/toolkit-distributions';

eventToolkitDistributionRouter.get(base, authorize(readers), toolkitDistributionController.list);
eventToolkitDistributionRouter.post(base, authorizeAnyPermission([D.create, D.update]), toolkitDistributionController.create);
eventToolkitDistributionRouter.get(`${base}/:id`, authorize(readers), toolkitDistributionController.detail);
eventToolkitDistributionRouter.patch(`${base}/:id`, authorizePermissions([D.update]), toolkitDistributionController.patch);
eventToolkitDistributionRouter.delete(`${base}/:id`, authorizePermissions([D.delete]), toolkitDistributionController.remove);
