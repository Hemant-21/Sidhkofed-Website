/**
 * Video controller — `/api/v1/admin/videos/*` (API spec §6).
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { videoService } from './video.service';
import { validateVideoCreate, validateVideoUpdate } from './video.validators';
import { parseYouTubeUrl } from './youtube';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateVideoCreate(req.body);
  const dto = await videoService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Video created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const state = req.query.publication_state as 'draft' | 'published' | 'unpublished' | 'archived' | undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const homepage = req.query.show_on_homepage === 'true' ? true : req.query.show_on_homepage === 'false' ? false : undefined;
  const { items, total } = await videoService.list({ publicationState: state, showOnHomepage: homepage, search }, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await videoService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateVideoUpdate(req.body);
  const dto = await videoService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Video updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await videoService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Video ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

/** POST /admin/videos/validate-url — stateless pre-check for the CMS form. */
export const validateUrl = wrap(async (req) => {
  const body = req.body as { youtube_url?: unknown };
  const raw = typeof body?.youtube_url === 'string' ? body.youtube_url : '';
  const parsed = parseYouTubeUrl(raw);
  if (!parsed) {
    return {
      status: 422,
      body: {
        success: false,
        error: { code: 'validation_error', message: 'Validation failed.', fields: { youtube_url: ['Enter a valid YouTube URL.'] } },
        meta: { request_id: String(req.id) },
      },
    };
  }
  return {
    status: 200,
    body: success(
      { valid: true, youtube_id: parsed.youtubeId, canonical_url: parsed.canonicalUrl, thumbnail_url: parsed.thumbnailUrl },
      String(req.id),
    ),
  };
});

export const videoController = { create, list, detail, patch, publish, unpublish, archive, restore, validateUrl };
