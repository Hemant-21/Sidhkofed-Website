/**
 * Operational Reports routes — mounted under the existing `/api/v1/admin/dashboard` prefix
 * alongside `dashboard.routes.ts` (see `src/routes/index.ts`). Read-only: no create/update/delete,
 * so authorization only ever needs `operational_reports.view`/`.export`.
 *
 *   GET  /admin/dashboard/operational-reports              catalogue (registry, minus internals)
 *   POST /admin/dashboard/operational-reports/:key/generate live-calculate a report
 *   POST /admin/dashboard/operational-reports/:key/export   XLSX export (Summary/Data/Definitions)
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { operationalReportsController } from './operational-reports.controller';
import { OPERATIONAL_REPORTS_PERMISSIONS } from './operational-reports.permissions';

export const operationalReportsRouter = Router();
operationalReportsRouter.use(authenticate);

const canView = authorizePermissions([OPERATIONAL_REPORTS_PERMISSIONS.view]);
const canExport = authorizePermissions([OPERATIONAL_REPORTS_PERMISSIONS.export]);

operationalReportsRouter.get('/', canView, operationalReportsController.listCatalogue);
operationalReportsRouter.post('/:key/generate', canView, operationalReportsController.generate);
operationalReportsRouter.post('/:key/export', canExport, operationalReportsController.exportReport);
