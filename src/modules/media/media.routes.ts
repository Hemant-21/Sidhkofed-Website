/**
 * Media routes — `/api/v1/admin/media/*` (API spec §6). Accessible to Super Admin,
 * Content Editor and Publisher (TASK 9). Multipart uploads use multer in-memory storage
 * (bytes are validated/sniffed before the storage write); multer errors are translated
 * into the typed error envelope.
 */
import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { uploadRateLimit } from '@/middleware/rate-limit';
import { enforceRequestSizeHeader, enforceAggregateUploadSize } from '@/middleware/upload-limit';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { uploadConfig } from '@/config';
import { ValidationError, UnsupportedFileTypeError, type AppError } from '@/shared/errors';
import { mediaController } from './media.controller';

const maxFileBytes =
  Math.max(uploadConfig.maxImageMb, uploadConfig.maxDocumentMb, uploadConfig.maxDatasetMb) * 1024 * 1024;

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes, files: uploadConfig.bulkMaxFiles },
});

/** Translate multer errors into the typed error contract. */
function translateMulter(err: unknown): AppError | unknown {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return new ValidationError({ file: ['File exceeds the maximum upload size.'] });
    if (err.code === 'LIMIT_FILE_COUNT') return new ValidationError({ files: ['Too many files.'] });
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return new UnsupportedFileTypeError('Unexpected upload field.');
    return new ValidationError({ file: [err.message] });
  }
  return err;
}

function withMulter(mw: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) =>
    mw(req, res, (err?: unknown) => (err ? next(translateMulter(err)) : next()));
}

const single = withMulter(multerUpload.single('file'));
const many = withMulter(multerUpload.array('files', uploadConfig.bulkMaxFiles));

export const mediaRouter = Router();

mediaRouter.param('id', uuidParam); // 422 (not 500) for a malformed :id (Issue 9)
// Media access stays ROLE-based (remediation Issue 5): the RBAC matrix gates media on a
// "media grant" but no `media.*` permission is seeded, so there is no permission to switch to.
// All three CMS roles may manage media; Super Admin bypasses.
mediaRouter.use(
  authenticate,
  authorize([ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher]),
);

// Upload routes are rate limited (Issue 5) BEFORE multer parses bytes, so a flood is
// rejected with 429 without buffering files. `enforceRequestSizeHeader` then rejects an
// oversized request early (413) by Content-Length, and `enforceAggregateUploadSize` bounds
// the total parsed size after multer (remediation Issue 2).
mediaRouter.post('/', uploadRateLimit, enforceRequestSizeHeader, single, enforceAggregateUploadSize, mediaController.upload);
mediaRouter.post('/upload', uploadRateLimit, enforceRequestSizeHeader, single, enforceAggregateUploadSize, mediaController.upload); // alias (TASK 5 vocabulary)
mediaRouter.post('/bulk-upload', uploadRateLimit, enforceRequestSizeHeader, many, enforceAggregateUploadSize, mediaController.bulkUpload);
mediaRouter.get('/', mediaController.list);
mediaRouter.get('/:id', mediaController.detail);
mediaRouter.patch('/:id', mediaController.patch);
mediaRouter.post('/:id/archive', mediaController.archive);
mediaRouter.post('/:id/restore', mediaController.restore);
mediaRouter.post('/:id/replace-file', uploadRateLimit, enforceRequestSizeHeader, single, enforceAggregateUploadSize, mediaController.replaceFile);
mediaRouter.get('/:id/usages', mediaController.usages);
mediaRouter.get('/:id/url', mediaController.getUrl);

/**
 * Public media delivery (Issue 2) — `/api/v1/public/media/:id/file`. No auth: the website
 * loads referenced media here. Serves non-archived assets only; streams local files and
 * 302-redirects to a fresh signed URL for S3. Never exposes the storage key.
 */
export const mediaPublicRouter = Router();
mediaPublicRouter.param('id', uuidParam);
mediaPublicRouter.get('/:id/file', mediaController.serveFile);
