/**
 * FAQ admin controller — `/api/v1/admin/faqs/*` (API spec §6). HTTP-only: parse → validate → call
 * the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { ValidationError } from '@/shared/errors';
import type { LifecycleAction } from '@/shared/publishing';
import { faqService } from './faqs.service';
import { validateFaqCreate, validateFaqUpdate, validateFaqPageReorder } from './faqs.validators';
import { parseFaqFilters, parseFaqOrdering } from './faqs.query';
import { FAQ_PAGE_REGISTRY, isRegisteredFaqPageKey } from './faqs.pages.registry';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

const create = wrap(async (req) => {
  const input = validateFaqCreate(req.body);
  const dto = await faqService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'FAQ created.') };
});

const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseFaqFilters(req, { admin: true });
  const ordering = parseFaqOrdering(req);
  const { items, total } = await faqService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /admin/faqs/pages — the registered main-page options the CMS multiselect/filter reads. */
const pages = wrap(async (req) => {
  const items = FAQ_PAGE_REGISTRY.map((p) => ({ page_key: p.key, path: p.path, label_en: p.labelEn, label_hi: p.labelHi }));
  return { status: 200, body: success(items, String(req.id)) };
});

/** POST /admin/faqs/pages/:pageKey/reorder */
const reorderPage = wrap(async (req) => {
  const pageKey = req.params.pageKey as string;
  if (!isRegisteredFaqPageKey(pageKey)) throw new ValidationError({ page_key: ['Unknown page key.'] });
  const input = validateFaqPageReorder(req.body);
  await faqService.reorderPage(pageKey, input, auditContext(req));
  return { status: 200, body: success({ page_key: pageKey, reordered: input.order.length }, String(req.id), 'FAQs reordered.') };
});

const detail = wrap(async (req) => {
  const dto = await faqService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

const patch = wrap(async (req) => {
  const input = validateFaqUpdate(req.body);
  const dto = await faqService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'FAQ updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await faqService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `FAQ ${action}ed.`) };
  });

const publish = lifecycle('publish');
const unpublish = lifecycle('unpublish');
const archive = lifecycle('archive');
const restore = lifecycle('restore');

export const faqController = { create, list, pages, reorderPage, detail, patch, publish, unpublish, archive, restore };
