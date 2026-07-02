/**
 * Tender admin controller — `/api/v1/admin/tenders/*` (API spec §6). HTTP-only: parse → validate →
 * call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { tenderService } from './tenders.service';
import { validateTenderCreate, validateTenderUpdate } from './tenders.validators';
import { parseTenderFilters, parseTenderOrdering } from './tenders.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateTenderCreate(req.body);
  const dto = await tenderService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Tender created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseTenderFilters(req, { admin: true });
  const ordering = parseTenderOrdering(req);
  const { items, total } = await tenderService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await tenderService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateTenderUpdate(req.body);
  const dto = await tenderService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Tender updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await tenderService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Tender ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const tenderController = { create, list, detail, patch, publish, unpublish, archive, restore };
