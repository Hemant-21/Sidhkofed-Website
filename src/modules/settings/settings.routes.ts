/**
 * Settings routes.
 *   /api/v1/admin/settings/*   — Super Admin only (API spec §6/§8).
 *   /api/v1/public/settings/*  — unauthenticated; curated allow-list only (settings.public.controller.ts).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { settingsController } from './settings.controller';
import { settingsPublicController } from './settings.public.controller';

export const settingsRouter = Router();

settingsRouter.use(authenticate, authorize([ROLE_KEYS.superAdmin]));

settingsRouter.get('/', settingsController.listAll);
settingsRouter.get('/:key', settingsController.getOne);
settingsRouter.put('/:key', settingsController.putOne);

// ── Public ─────────────────────────────────────────────────────────────────────
export const settingsPublicRouter = Router();
settingsPublicRouter.get('/:group', settingsPublicController.getPublicGroup);
