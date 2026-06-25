/**
 * Programme admin controller — `/api/v1/admin/programmes/*` (API spec §6). HTTP-only.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { programmeService } from './programmes.service';
import { validateProgrammeCreate, validateProgrammeUpdate } from './programmes.validators';
import { parseProgrammeFilters, parseProgrammeOrdering } from './programmes.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateProgrammeCreate(req.body);
  const dto = await programmeService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Programme created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseProgrammeFilters(req, { admin: true });
  const ordering = parseProgrammeOrdering(req, true);
  const { items, total } = await programmeService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await programmeService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateProgrammeUpdate(req.body);
  const dto = await programmeService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Programme updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await programmeService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Programme ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const programmeController = { create, list, detail, patch, publish, unpublish, archive, restore };
