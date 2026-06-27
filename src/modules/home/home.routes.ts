/**
 * Public homepage route — `/api/v1/public/home` (API spec §5). Unauthenticated; aggregate of
 * homepage-flagged published content. Mounted AFTER `/public/home/partners` so the more specific
 * partners sub-route is not shadowed.
 */
import { Router } from 'express';
import { homeController } from './home.controller';

export const homePublicRouter = Router();
homePublicRouter.get('/', homeController.home);
