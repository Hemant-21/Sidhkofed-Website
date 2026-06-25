/**
 * Audit controller — read-only list/detail (API spec §6 "Users, settings, and audit").
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { NotFoundError } from '@/shared/errors';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { resolveOrdering } from '@/shared/listing';
import { auditRepository } from './audit.repository';
import { validateAuditQuery } from './audit.validators';
import { toAuditLogDto } from './audit.dto';

const ORDERING_ALLOW = ['created_at'] as const;

/** GET /admin/audit-logs — filtered, paginated list. */
export function list(req: Request, res: Response, next: NextFunction): void {
  let query;
  try {
    query = validateAuditQuery(req.query);
  } catch (err) {
    return next(err);
  }
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const order = resolveOrdering(req.query.ordering, ORDERING_ALLOW, { field: 'created_at', direction: 'desc' });

  auditRepository
    .list(
      {
        module: query.module,
        recordId: query.record_id,
        userId: query.user_id,
        action: query.action,
        dateFrom: query.date_from,
        dateTo: query.date_to,
      },
      page.skip,
      page.take,
      order.direction,
    )
    .then(({ rows, total }) => {
      res
        .status(200)
        .json(paginated(rows.map(toAuditLogDto), buildPagination(total, page), String(req.id)));
    })
    .catch(next);
}

/** GET /admin/audit-logs/:id */
export function detail(req: Request, res: Response, next: NextFunction): void {
  const id = req.params.id as string;
  auditRepository
    .findById(id)
    .then((row) => {
      if (!row) throw new NotFoundError('Audit log not found.');
      res.status(200).json(success(toAuditLogDto(row), String(req.id)));
    })
    .catch(next);
}

export const auditController = { list, detail };
