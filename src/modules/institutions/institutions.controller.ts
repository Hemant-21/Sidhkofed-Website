/**
 * Institution admin controller — `/api/v1/admin/institutions/*` (API spec §6). HTTP-only:
 * parse → validate → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { institutionService } from './institutions.service';
import { validateInstitutionCreate, validateInstitutionUpdate } from './institutions.validators';
import { parseInstitutionFilters, parseInstitutionOrdering } from './institutions.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateInstitutionCreate(req.body);
  const dto = await institutionService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Institution created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseInstitutionFilters(req, { admin: true });
  const ordering = parseInstitutionOrdering(req, true);
  const { items, total } = await institutionService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await institutionService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateInstitutionUpdate(req.body);
  const dto = await institutionService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Institution updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await institutionService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Institution ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const institutionController = { create, list, detail, patch, publish, unpublish, archive, restore };
