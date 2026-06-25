/**
 * Page admin controller — `/api/v1/admin/pages/*` (API spec §6). HTTP-only: parse → validate →
 * call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { pageService } from './pages.service';
import { validatePageCreate, validatePageUpdate } from './pages.validators';
import { parsePageFilters, parsePageOrdering } from './pages.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validatePageCreate(req.body);
  const dto = await pageService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Page created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parsePageFilters(req);
  const ordering = parsePageOrdering(req);
  const { items, total } = await pageService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await pageService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validatePageUpdate(req.body);
  const dto = await pageService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Page updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await pageService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Page ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const pageController = { create, list, detail, patch, publish, unpublish, archive, restore };
