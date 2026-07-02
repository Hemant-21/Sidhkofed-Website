/**
 * Document public controller — `/api/v1/public/documents/*` and `/api/v1/public/knowledge-centre`
 * (API spec §5, TASK 13). No authentication; returns only published, publicly-visible,
 * non-archived, due, is_public documents (the visibility predicate is enforced in the repository).
 * Responses are Redis-cached and invalidated on any admin write (TASK 12).
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { documentService } from './documents.service';
import { parseDocumentFilters, parseDocumentOrdering } from './documents.query';
import type { DocumentFilters } from './documents.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

/** Deterministic cache key for a public list (surface + filters + ordering + page). */
function listCacheKey(surface: string, filters: DocumentFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `documents:public:list:${surface}:${hash}`;
}

async function listSurface(req: Request, surface: 'documents' | 'knowledge-centre', force: Partial<DocumentFilters>) {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters: DocumentFilters = { ...parseDocumentFilters(req, { admin: false }), ...force };
  const ordering = parseDocumentOrdering(req, false);
  const key = listCacheKey(surface, filters, ordering, page.page, page.pageSize);
  const { items, total } = await documentService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
}

/** GET /public/documents */
export const list = wrap((req) => listSurface(req, 'documents', {}));

/** GET /public/knowledge-centre — only documents explicitly tagged for the Knowledge Centre. */
export const knowledgeCentre = wrap((req) => listSurface(req, 'knowledge-centre', { knowledgeCentre: true }));

/** GET /public/documents/{slug} */
export const detail = wrap(async (req) => {
  const dto = await documentService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const documentPublicController = { list, knowledgeCentre, detail };
