/**
 * Gallery controller — `/api/v1/admin/galleries/*` (API spec §6).
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import type { LifecycleAction } from '@/shared/publishing';
import { galleryService } from './gallery.service';
import {
  validateGalleryCreate,
  validateGalleryUpdate,
  validateGalleryImage,
  validateGalleryImageUpdate,
  validateReorder,
} from './gallery.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const create = wrap(async (req) => {
  const input = validateGalleryCreate(req.body);
  const dto = await galleryService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Gallery created.') };
});

export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const state = req.query.publication_state as 'draft' | 'published' | 'unpublished' | 'archived' | undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const { items, total } = await galleryService.list({ publicationState: state, search }, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await galleryService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateGalleryUpdate(req.body);
  const dto = await galleryService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Gallery updated.') };
});

const lifecycle = (action: LifecycleAction) =>
  wrap(async (req) => {
    const dto = await galleryService.lifecycle(req.params.id as string, action, auditContext(req));
    return { status: 200, body: success(dto, String(req.id), `Gallery ${action}ed.`) };
  });

export const publish = lifecycle('publish');
export const unpublish = lifecycle('unpublish');
export const archive = lifecycle('archive');
export const restore = lifecycle('restore');

export const addImage = wrap(async (req) => {
  const input = validateGalleryImage(req.body);
  const dto = await galleryService.addImage(req.params.id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Image added.') };
});

export const updateImage = wrap(async (req) => {
  const input = validateGalleryImageUpdate(req.body);
  const dto = await galleryService.updateImage(req.params.id as string, req.params.imageId as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Image updated.') };
});

export const removeImage = wrap(async (req) => {
  const dto = await galleryService.removeImage(req.params.id as string, req.params.imageId as string, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Image removed.') };
});

export const reorder = wrap(async (req) => {
  const input = validateReorder(req.body);
  const dto = await galleryService.reorderImages(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Images reordered.') };
});

export const galleryController = {
  create, list, detail, patch, publish, unpublish, archive, restore,
  addImage, updateImage, removeImage, reorder,
};
