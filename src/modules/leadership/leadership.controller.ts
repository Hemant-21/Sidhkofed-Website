/**
 * Leadership admin controller — `/api/v1/admin/leadership/*`. HTTP-only: parse → validate → call the
 * service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { leadershipService } from './leadership.service';
import { validateLeadershipCreate, validateLeadershipUpdate } from './leadership.validators';
import { parseLeadershipFilters, parseLeadershipOrdering } from './leadership.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateLeadershipCreate(req.body);
  const dto = await leadershipService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Leadership entry created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseLeadershipFilters(req, { admin: true });
  const ordering = parseLeadershipOrdering(req);
  const { items, total } = await leadershipService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await leadershipService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateLeadershipUpdate(req.body);
  const dto = await leadershipService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Leadership entry updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await leadershipService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Leadership entry ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const leadershipController = { create, list, detail, patch, publish, unpublish, archive, restore };
