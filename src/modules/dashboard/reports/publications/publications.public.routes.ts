/**
 * Public Report Publications routes — mounted at `/api/v1/public/reports` (see `src/routes/index.ts`).
 * No authentication, no live query — reads only ever come from an immutable `ReportPublication` row.
 *
 *   GET /public/reports/years      every FY with isPublished/isCurrentFinancialYear/publishedAt
 *   GET /public/reports/:label     the approved Programme/District/Commodity bundle for one FY
 */
import { Router } from 'express';
import { publicationsPublicController } from './publications.public.controller';

export const publicationsPublicRouter = Router();

publicationsPublicRouter.get('/years', publicationsPublicController.listYears);
publicationsPublicRouter.get('/:label', publicationsPublicController.getByLabel);
