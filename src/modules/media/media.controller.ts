/**
 * Media controller — HTTP in/out for the media endpoints (API spec §6 media). Multipart
 * parsing is done by the multer middleware in the routes; this layer maps the request to
 * the service and returns through the envelope.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { ValidationError } from '@/shared/errors';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { mediaService, type UploadFile } from './media.service';
import { validateMediaMeta, validateMediaQuery } from './media.validators';

type MulterFile = { buffer: Buffer; originalname: string; mimetype: string };

function toUploadFile(f: MulterFile): UploadFile {
  return { buffer: f.buffer, originalName: f.originalname, declaredMime: f.mimetype };
}

/** POST /admin/media  (and alias /admin/media/upload) */
export function upload(req: Request, res: Response, next: NextFunction): void {
  const file = (req as Request & { file?: MulterFile }).file;
  if (!file) return next(new ValidationError({ file: ['A file is required.'] }));
  let meta;
  try {
    meta = validateMediaMeta(req.body);
  } catch (err) {
    return next(err);
  }
  mediaService
    .upload(toUploadFile(file), { title: meta.title, altText: meta.alt_text, caption: meta.caption }, auditContext(req))
    .then((dto) => {
      res.status(201).location(`/api/v1/admin/media/${dto.id}`).json(success(dto, String(req.id), 'Media uploaded.'));
    })
    .catch(next);
}

/** POST /admin/media/bulk-upload */
export function bulkUpload(req: Request, res: Response, next: NextFunction): void {
  const files = (req as Request & { files?: MulterFile[] }).files;
  if (!files || files.length === 0) return next(new ValidationError({ files: ['At least one file is required.'] }));
  mediaService
    .bulkUpload(files.map(toUploadFile), auditContext(req))
    .then((result) => res.status(201).json(success(result, String(req.id), 'Bulk upload processed.')))
    .catch(next);
}

/** GET /admin/media */
export function list(req: Request, res: Response, next: NextFunction): void {
  let query;
  try {
    query = validateMediaQuery(req.query);
  } catch (err) {
    return next(err);
  }
  const page = resolvePageParams(req.query.page, req.query.page_size);
  mediaService
    .list({ mimeType: query.mime_type, archived: query.archived, search: query.search, usedBy: query.used_by }, page.skip, page.take, 'desc')
    .then(({ items, total }) => res.status(200).json(paginated(items, buildPagination(total, page), String(req.id))))
    .catch(next);
}

/** GET /admin/media/:id */
export function detail(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .getById(req.params.id as string)
    .then((dto) => res.status(200).json(success(dto, String(req.id))))
    .catch(next);
}

/** PATCH /admin/media/:id */
export function patch(req: Request, res: Response, next: NextFunction): void {
  let meta;
  try {
    meta = validateMediaMeta(req.body);
  } catch (err) {
    return next(err);
  }
  mediaService
    .updateMeta(req.params.id as string, { title: meta.title, altText: meta.alt_text, caption: meta.caption }, auditContext(req))
    .then((dto) => res.status(200).json(success(dto, String(req.id), 'Media updated.')))
    .catch(next);
}

/** POST /admin/media/:id/archive */
export function archive(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .archive(req.params.id as string, auditContext(req))
    .then((dto) => res.status(200).json(success(dto, String(req.id), 'Media archived.')))
    .catch(next);
}

/** POST /admin/media/:id/restore */
export function restore(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .restore(req.params.id as string, auditContext(req))
    .then((dto) => res.status(200).json(success(dto, String(req.id), 'Media restored.')))
    .catch(next);
}

/** POST /admin/media/:id/replace-file */
export function replaceFile(req: Request, res: Response, next: NextFunction): void {
  const file = (req as Request & { file?: MulterFile }).file;
  if (!file) return next(new ValidationError({ file: ['A replacement file is required.'] }));
  mediaService
    .replaceFile(req.params.id as string, toUploadFile(file), auditContext(req))
    .then((result) => res.status(200).json(success(result, String(req.id), 'Media file replaced.')))
    .catch(next);
}

/** GET /admin/media/:id/usages */
export function usages(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .usages(req.params.id as string)
    .then((rows) => res.status(200).json(success(rows, String(req.id))))
    .catch(next);
}

/** GET /admin/media/:id/url — fresh, on-demand delivery URL (signed for S3). */
export function getUrl(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .getDeliveryUrl(req.params.id as string)
    .then((data) => res.status(200).json(success(data, String(req.id))))
    .catch(next);
}

/** GET /public/media/:id/file — deliver bytes (local stream) or redirect (S3 signed URL). */
export function serveFile(req: Request, res: Response, next: NextFunction): void {
  mediaService
    .openFile(req.params.id as string)
    .then((delivery) => {
      if (delivery.kind === 'redirect') {
        res.redirect(302, delivery.url);
        return;
      }
      res.setHeader('Content-Type', delivery.contentType);
      if (typeof delivery.contentLength === 'number') {
        res.setHeader('Content-Length', String(delivery.contentLength));
      }
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(delivery.fileName)}"`);
      // Media bytes are immutable per asset id; allow downstream caching.
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (delivery.kind === 'stream') {
        delivery.stream.on('error', next).pipe(res);
        return;
      }
      res.send(delivery.body);
    })
    .catch(next);
}

export const mediaController = {
  upload,
  bulkUpload,
  list,
  detail,
  patch,
  archive,
  restore,
  replaceFile,
  usages,
  getUrl,
  serveFile,
};
