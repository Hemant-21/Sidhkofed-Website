/**
 * Procurement Update admin controller — `/api/v1/admin/procurement-updates/*` (API spec §6).
 * HTTP-only: parse → validate → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { procurementUpdateService } from './procurement-updates.service';
import {
  validateProcurementUpdateCreate,
  validateProcurementUpdateUpdate,
} from './procurement-updates.validators';
import { parseProcurementUpdateFilters, parseProcurementUpdateOrdering } from './procurement-updates.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateProcurementUpdateCreate(req.body);
  const dto = await procurementUpdateService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Procurement update created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseProcurementUpdateFilters(req, { admin: true });
  const ordering = parseProcurementUpdateOrdering(req);
  const { items, total } = await procurementUpdateService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await procurementUpdateService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateProcurementUpdateUpdate(req.body);
  const dto = await procurementUpdateService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Procurement update updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await procurementUpdateService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Procurement update ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const procurementUpdateController = { create, list, detail, patch, publish, unpublish, archive, restore };
