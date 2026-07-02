/**
 * Gallery public controller — `/api/v1/public/galleries/*` (API spec §5). No authentication; returns
 * only published, publicly-visible, non-archived, due galleries (the visibility predicate is enforced
 * in the repository). Responses are Redis-cached and invalidated on any admin write. Public responses
 * never expose publication_state, archived_at, or audit fields.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { galleryService } from './gallery.service';
import { parseGalleryPublicFilters, parseGalleryPublicOrdering } from './gallery.query';
import type { GalleryPublicListFilters } from './gallery.repository';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function listCacheKey(filters: GalleryPublicListFilters, ordering: unknown, page: number, pageSize: number): string {
  const payload = JSON.stringify({ filters, ordering, page, pageSize });
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
  return `galleries:public:list:${hash}`;
}

/** GET /public/galleries */
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseGalleryPublicFilters(req);
  const ordering = parseGalleryPublicOrdering(req);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await galleryService.publicList(filters, ordering, { skip: page.skip, take: page.take }, key);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

/** GET /public/galleries/{slug} */
export const detail = wrap(async (req) => {
  const dto = await galleryService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const galleryPublicController = { list, detail };
