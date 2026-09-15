/**
 * Public Operational Reports routes — mounted at `/api/v1/public/operational-reports` (see
 * `src/routes/index.ts`). No authentication. This is the live-data replacement for the retired
 * `/public/dashboard*` routes: the public website's `/impact/dashboard` page and homepage read
 * these instead of the old `DashboardReport`/`DashboardMetric` rows.
 *
 *   GET /public/operational-reports       all six reports, public-eligible measures only
 *   GET /public/operational-reports/:key  one report, public-eligible measures only, 404 if unknown
 */
import { Router } from 'express';
import { operationalReportsPublicController } from './operational-reports.public.controller';

export const operationalReportsPublicRouter = Router();

operationalReportsPublicRouter.get('/', operationalReportsPublicController.listAll);
operationalReportsPublicRouter.get('/:key', operationalReportsPublicController.getOne);
