/**
 * FAQ admin controller — `/api/v1/admin/faqs/*` (API spec §6). HTTP-only: parse → validate → call
 * the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { faqService } from './faqs.service';
import { validateFaqCreate, validateFaqUpdate } from './faqs.validators';
import { parseFaqFilters, parseFaqOrdering } from './faqs.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateFaqCreate(req.body);
  const dto = await faqService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'FAQ created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseFaqFilters(req, { admin: true });
  const ordering = parseFaqOrdering(req);
  const { items, total } = await faqService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await faqService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateFaqUpdate(req.body);
  const dto = await faqService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'FAQ updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await faqService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `FAQ ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const faqController = { create, list, detail, patch, publish, unpublish, archive, restore };
