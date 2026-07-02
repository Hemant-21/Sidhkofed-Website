/**
 * Settings routes — `/api/v1/admin/settings/*`. Super Admin only (API spec §6/§8).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { settingsController } from './settings.controller';

export const settingsRouter = Router();

settingsRouter.use(authenticate, authorize([ROLE_KEYS.superAdmin]));

settingsRouter.get('/', settingsController.listAll);
settingsRouter.get('/:key', settingsController.getOne);
settingsRouter.put('/:key', settingsController.putOne);
