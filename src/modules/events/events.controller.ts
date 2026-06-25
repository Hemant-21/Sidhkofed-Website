/**
 * Event admin controller — `/api/v1/admin/events/*` (API spec §6). HTTP-only. Includes the
 * lifecycle actions plus the event-specific actions complete / cancel / publish-as-news. The
 * publish-as-news handler delegates to the derived-news service (cross-module service call).
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { eventService } from './events.service';
import {
  validateEventCreate,
  validateEventUpdate,
  validateEventComplete,
  validateEventCancel,
} from './events.validators';
import { parseEventFilters, parseEventOrdering } from './events.query';
import { newsService } from './news/news.service';
import { validatePublishAsNews } from './news/news.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateEventCreate(req.body);
  const dto = await eventService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Event created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseEventFilters(req, { admin: true });
  const ordering = parseEventOrdering(req, true);
  const { items, total } = await eventService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await eventService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateEventUpdate(req.body);
  const dto = await eventService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Event updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await eventService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Event ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const complete = wrap(async (req) => {
  const input = validateEventComplete(req.body);
  const dto = await eventService.complete(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Event completed.') };
});

export const cancel = wrap(async (req) => {
  const input = validateEventCancel(req.body);
  const dto = await eventService.cancel(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Event cancelled.') };
});

/** POST /admin/events/{id}/publish-as-news — creates the derived news record (201). */
export const publishAsNews = wrap(async (req) => {
  const input = validatePublishAsNews(req.body);
  const dto = await newsService.publishFromEvent(req.params.id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Event published as news.') };
});

export const eventController = {
  create,
  list,
  detail,
  patch,
  publish,
  unpublish,
  archive,
  restore,
  complete,
  cancel,
  publishAsNews,
};
