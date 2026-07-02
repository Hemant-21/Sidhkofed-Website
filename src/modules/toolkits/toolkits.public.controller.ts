/**
 * Toolkit public controller — `/api/v1/public/toolkits/*` (API spec §5). No auth; published only;
 * Redis-cached. The `distribution-summary` endpoint aggregates published per-event distribution
 * figures for the toolkit (summary figures only — never beneficiary-level data).
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { toolkitService } from './toolkits.service';
import { toolkitDistributionService } from '@/modules/events/toolkit-distributions/toolkit-distributions.service';
import { parseToolkitFilters, parseToolkitOrdering } from './toolkits.query';
import type { ToolkitFilters } from './toolkits.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

function listCacheKey(filters: ToolkitFilters, ordering: unknown, page: number, pageSize: number): string {
  const hash = createHash('sha1').update(JSON.stringify({ filters, ordering, page, pageSize })).digest('hex').slice(0, 16);
  return `toolkits:public:list:${hash}`;
}

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseToolkitFilters(req, { admin: false });
  const ordering = parseToolkitOrdering(req, false);
  const key = listCacheKey(filters, ordering, page.page, page.pageSize);
  const { items, total } = await toolkitService.publicList(
    filters,
    ordering,
    { skip: page.skip, take: page.take, page: page.page, pageSize: page.pageSize },
    key,
  );
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await toolkitService.publicDetailBySlug(req.params.slug as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const distributionSummary = wrap(async (req) => {
  // Resolve the published toolkit (toolkits module), then aggregate its per-event distribution
  // figures (events/toolkit-distributions module). The aggregation is summary-only.
  const toolkit = await toolkitService.publicRowBySlug(req.params.slug as string);
  const dto = await toolkitDistributionService.aggregateForToolkit({
    id: toolkit.id,
    slug: toolkit.slug,
    titleEn: toolkit.titleEn,
    titleHi: toolkit.titleHi,
  });
  return { status: 200, body: success(dto, String(req.id)) };
});

export const toolkitPublicController = { list, detail, distributionSummary };
