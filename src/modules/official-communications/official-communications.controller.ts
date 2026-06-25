/**
 * Official Communication admin controller — `/api/v1/admin/official-communications/*` (API spec §6).
 * HTTP-only: parse → validate → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { officialCommunicationService } from './official-communications.service';
import {
  validateOfficialCommunicationCreate,
  validateOfficialCommunicationUpdate,
} from './official-communications.validators';
import {
  parseOfficialCommunicationFilters,
  parseOfficialCommunicationOrdering,
} from './official-communications.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateOfficialCommunicationCreate(req.body);
  const dto = await officialCommunicationService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Official communication created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseOfficialCommunicationFilters(req, { admin: true });
  const ordering = parseOfficialCommunicationOrdering(req, true);
  const { items, total } = await officialCommunicationService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await officialCommunicationService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateOfficialCommunicationUpdate(req.body);
  const dto = await officialCommunicationService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Official communication updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await officialCommunicationService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Official communication ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const officialCommunicationController = {
  create,
  list,
  detail,
  patch,
  publish,
  unpublish,
  archive,
  restore,
};
