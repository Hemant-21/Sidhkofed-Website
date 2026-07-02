/**
 * Audit routes — `/api/v1/admin/audit-logs/*`. Read-only, Super Admin only
 * (API spec §6 + §8 RBAC matrix).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { auditController } from './audit.controller';

export const auditRouter = Router();

auditRouter.use(authenticate, authorize([ROLE_KEYS.superAdmin]));

auditRouter.get('/', auditController.list);
auditRouter.get('/:id', auditController.detail);
