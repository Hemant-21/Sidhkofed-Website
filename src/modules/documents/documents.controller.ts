/**
 * Document admin controller — `/api/v1/admin/documents/*` (API spec §6). HTTP-only: parse →
 * validate → call the service → return through the shared envelope. No business logic, no Prisma.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { documentService } from './documents.service';
import { validateDocumentCreate, validateDocumentUpdate, validateReplaceFile } from './documents.validators';
import { parseDocumentFilters, parseDocumentOrdering } from './documents.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

const create = wrap(async (req) => {
  const input = validateDocumentCreate(req.body);
  const dto = await documentService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Document created.') };
});

const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseDocumentFilters(req, { admin: true });
  const ordering = parseDocumentOrdering(req, true);
  const { items, total } = await documentService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

const detail = wrap(async (req) => {
  const dto = await documentService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

const patch = wrap(async (req) => {
  const input = validateDocumentUpdate(req.body);
  const dto = await documentService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Document updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await documentService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Document ${action}ed.`) };
  });

const publish = lifecycle('publish');
const unpublish = lifecycle('unpublish');
const archive = lifecycle('archive');
const restore = lifecycle('restore');

const replaceFile = wrap(async (req) => {
  const input = validateReplaceFile(req.body);
  const dto = await documentService.replaceFile(req.params.id as string, input.file_asset_id, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Document file replaced.') };
});

export const documentController = {
  create,
  list,
  detail,
  patch,
  publish,
  unpublish,
  archive,
  restore,
  replaceFile,
};
