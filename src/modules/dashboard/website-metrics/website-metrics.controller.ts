/**
 * Website Metrics admin controllers — `/api/v1/admin/dashboard/website-metrics/*`. HTTP-only:
 * parse → validate → call the service → return through the shared envelope. Permissions are
 * enforced at the route layer.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { ValidationError } from '@/shared/errors';
import { websiteMetricsService } from './website-metrics.service';
import { validateCreateBody, validateUpdateBody } from './website-metrics.validators';
import { WEBSITE_METRIC_ORDERING_FIELDS, type WebsiteMetricOrderingField } from './website-metrics.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function parseFilters(req: Request) {
  const q = req.query;
  const fields: Record<string, string[]> = {};
  const asBool = (name: string): boolean | undefined => {
    const raw = q[name];
    if (raw === undefined) return undefined;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    (fields[name] ??= []).push('Must be "true" or "false".');
    return undefined;
  };
  const filters = {
    placementKey: typeof q.placement === 'string' ? q.placement : undefined,
    isEnabled: asBool('enabled'),
    isArchived: asBool('archived'),
  };
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  return filters;
}

function parseOrdering(req: Request): { field: WebsiteMetricOrderingField; direction: 'asc' | 'desc' } {
  const rawField = typeof req.query.sort === 'string' ? req.query.sort : 'display_order';
  const field = (WEBSITE_METRIC_ORDERING_FIELDS as readonly string[]).includes(rawField)
    ? (rawField as WebsiteMetricOrderingField)
    : 'display_order';
  const direction = req.query.order === 'desc' ? 'desc' : 'asc';
  return { field, direction };
}

const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseFilters(req);
  const ordering = parseOrdering(req);
  const { items, total } = await websiteMetricsService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

const create = wrap(async (req) => {
  const input = validateCreateBody(req.body);
  const dto = await websiteMetricsService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Website metric created.') };
});

const detail = wrap(async (req) => {
  const dto = await websiteMetricsService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

const patch = wrap(async (req) => {
  const input = validateUpdateBody(req.body);
  const dto = await websiteMetricsService.updateConfig(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric configuration updated.') };
});

const preview = wrap(async (req) => {
  const result = await websiteMetricsService.preview(req.params.id as string, auditContext(req));
  return { status: 200, body: success(result, String(req.id)) };
});

const publish = wrap(async (req) => {
  const previewToken = typeof req.body?.previewToken === 'string' ? req.body.previewToken : undefined;
  if (!previewToken) throw new ValidationError({ previewToken: ['previewToken is required.'] });
  const dto = await websiteMetricsService.publish(req.params.id as string, previewToken, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric published.') };
});

const unpublish = wrap(async (req) => {
  const dto = await websiteMetricsService.unpublish(req.params.id as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric unpublished.') };
});

const archive = wrap(async (req) => {
  const dto = await websiteMetricsService.archive(req.params.id as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric archived.') };
});

const restore = wrap(async (req) => {
  const dto = await websiteMetricsService.restore(req.params.id as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric restored.') };
});

const history = wrap(async (req) => {
  const items = await websiteMetricsService.history(req.params.id as string);
  return { status: 200, body: success(items, String(req.id)) };
});

const flagReview = wrap(async (req) => {
  const dto = await websiteMetricsService.flagForReview(req.params.id as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric flagged for review.') };
});

const unflagReview = wrap(async (req) => {
  const dto = await websiteMetricsService.unflagForReview(req.params.id as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Website metric review flag cleared.') };
});

export const websiteMetricsController = {
  list,
  create,
  detail,
  patch,
  preview,
  publish,
  unpublish,
  archive,
  restore,
  history,
  flagReview,
  unflagReview,
};
