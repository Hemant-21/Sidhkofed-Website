/**
 * Toolkit admin controller — `/api/v1/admin/toolkits/*` (API spec §6). HTTP-only.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { toolkitService } from './toolkits.service';
import { validateToolkitCreate, validateToolkitUpdate } from './toolkits.validators';
import { parseToolkitFilters, parseToolkitOrdering } from './toolkits.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateToolkitCreate(req.body);
  const dto = await toolkitService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Toolkit created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseToolkitFilters(req, { admin: true });
  const ordering = parseToolkitOrdering(req, true);
  const { items, total } = await toolkitService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await toolkitService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateToolkitUpdate(req.body);
  const dto = await toolkitService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Toolkit updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await toolkitService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Toolkit ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const toolkitController = { create, list, detail, patch, publish, unpublish, archive, restore };
