/**
 * Membership admin controller — `/api/v1/admin/memberships/*` (API spec §6). HTTP-only: parse →
 * validate → call the service → return through the shared envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { membershipService } from './memberships.service';
import {
  validateMembershipCreate,
  validateMembershipUpdate,
  validateMembershipBulkUpload,
} from './memberships.validators';
import { parseMembershipFilters, parseMembershipOrdering } from './memberships.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateMembershipCreate(req.body);
  const dto = await membershipService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Membership created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseMembershipFilters(req, { admin: true });
  const ordering = parseMembershipOrdering(req, true);
  const { items, total } = await membershipService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await membershipService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateMembershipUpdate(req.body);
  const dto = await membershipService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Membership updated.') };
});

export const bulkUpload = wrap(async (req) => {
  const { rows } = validateMembershipBulkUpload(req.body);
  const result = await membershipService.bulkUpload(rows, auditContext(req));
  return {
    status: 200,
    body: success(
      result,
      String(req.id),
      `Bulk upload processed: ${result.created_count} created, ${result.skipped_count} skipped.`,
    ),
  };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await membershipService.lifecycle(
      req.params.id as string,
      action,
      auditContext(req),
    );
    return { status: 200, body: success(dto, String(req.id), `Membership ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const membershipController = {
  create,
  list,
  detail,
  patch,
  bulkUpload,
  publish,
  unpublish,
  archive,
  restore,
};
