/**
 * Event News admin controller — `/api/v1/admin/news/*` (API spec §6). HTTP-only. Publish-as-news
 * lives on the events controller (its route is /admin/events/{id}/publish-as-news).
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { newsService } from './news.service';
import { validateNewsUpdate } from './news.validators';
import { parseNewsFilters, parseNewsOrdering } from './news.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseNewsFilters(req, { admin: true });
  const ordering = parseNewsOrdering(req, true);
  const { items, total } = await newsService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await newsService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateNewsUpdate(req.body);
  const dto = await newsService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'News updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await newsService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `News ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive'); // "Remove from News"
export const restore = lifecycle('restore');

export const newsController = { list, detail, patch, publish, unpublish, archive, restore };
