/**
 * Digital Service admin controller — `/api/v1/admin/digital-services/*` (API spec §6). HTTP-only:
 * parse → validate → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { digitalServiceService } from './digital-services.service';
import { validateDigitalServiceCreate, validateDigitalServiceUpdate } from './digital-services.validators';
import { parseDigitalServiceFilters, parseDigitalServiceOrdering } from './digital-services.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateDigitalServiceCreate(req.body);
  const dto = await digitalServiceService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Digital service created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseDigitalServiceFilters(req, { admin: true });
  const ordering = parseDigitalServiceOrdering(req);
  const { items, total } = await digitalServiceService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await digitalServiceService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateDigitalServiceUpdate(req.body);
  const dto = await digitalServiceService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Digital service updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await digitalServiceService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Digital service ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const digitalServiceController = { create, list, detail, patch, publish, unpublish, archive, restore };
