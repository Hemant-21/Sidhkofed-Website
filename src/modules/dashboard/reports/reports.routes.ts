/**
 * Reports routes — mounted under `/api/v1/admin/dashboard/reports` (see `dashboard.routes.ts`).
 * Read-only: only `operational_reports.view`/`.export` are needed.
 *
 *   GET  /admin/dashboard/reports/filter-options         FY/programme/district/block/eventType/commodity options
 *   POST /admin/dashboard/reports/:key/generate           live-calculate one of the three reports
 *   POST /admin/dashboard/reports/:key/export              XLSX export
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { reportsController } from './reports.controller';
import { REPORTS_PERMISSIONS } from './reports.permissions';
import { publicationsRouter } from './publications/publications.routes';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

const canView = authorizePermissions([REPORTS_PERMISSIONS.view]);
const canExport = authorizePermissions([REPORTS_PERMISSIONS.export]);

// Mounted before `/:key/*` so "publications" is never swallowed as a report key.
reportsRouter.use('/publications', publicationsRouter);

reportsRouter.get('/filter-options', canView, reportsController.listFilterOptions);
reportsRouter.post('/:key/generate', canView, reportsController.generate);
reportsRouter.post('/:key/export', canExport, reportsController.exportReport);
