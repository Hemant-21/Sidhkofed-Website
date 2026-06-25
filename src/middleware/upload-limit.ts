/**
 * Aggregate upload-size protection (remediation Issue 2).
 *
 * Multer already enforces a per-file size limit and a file-count limit, but NOT the total size
 * of a multipart request. Without an aggregate bound, a single request of many max-size files
 * can buffer a large amount into memory (memoryStorage). These two guards add that bound
 * without redesigning the storage subsystem:
 *
 *   1. `enforceRequestSizeHeader` runs BEFORE multer and rejects early using the declared
 *      `Content-Length` — so an oversized, length-declared request never gets buffered.
 *   2. `enforceAggregateUploadSize` runs AFTER multer (defence in depth, and the only check
 *      possible for chunked requests with no Content-Length): it sums the parsed file sizes and
 *      rejects if the total exceeds the cap.
 *
 * Both return `413 Payload Too Large` and log structurally.
 */
import type { Request, Response, NextFunction } from 'express';
import { uploadConfig } from '@/config';
import { PayloadTooLargeError } from '@/shared/errors';
import { logger } from '@/shared/logger';

const uploadLog = logger.child({ component: 'upload-limit' });

type MulterFile = { size?: number; buffer?: Buffer; originalname?: string };

/** Pre-multer guard: reject when the declared Content-Length exceeds the aggregate cap. */
export function enforceRequestSizeHeader(req: Request, _res: Response, next: NextFunction): void {
  const max = uploadConfig.maxRequestBytes;
  const header = req.headers['content-length'];
  if (header !== undefined) {
    const declared = Number(header);
    if (Number.isFinite(declared) && declared > max) {
      uploadLog.warn(
        { event: 'upload_request_too_large', declared_bytes: declared, max_bytes: max, path: req.path },
        'Rejected oversized upload request (Content-Length)',
      );
      return next(new PayloadTooLargeError(`Upload request exceeds the ${uploadConfig.maxRequestMb} MB limit.`));
    }
  }
  next();
}

/** Post-multer guard: reject when the summed size of parsed files exceeds the aggregate cap. */
export function enforceAggregateUploadSize(req: Request, _res: Response, next: NextFunction): void {
  const max = uploadConfig.maxRequestBytes;
  const single = (req as Request & { file?: MulterFile }).file;
  const many = (req as Request & { files?: MulterFile[] }).files;
  const files: MulterFile[] = many ?? (single ? [single] : []);

  let total = 0;
  for (const f of files) total += f.size ?? f.buffer?.length ?? 0;

  if (total > max) {
    uploadLog.warn(
      { event: 'upload_aggregate_too_large', total_bytes: total, max_bytes: max, file_count: files.length, path: req.path },
      'Rejected upload: aggregate size over limit',
    );
    return next(new PayloadTooLargeError(`Upload request exceeds the ${uploadConfig.maxRequestMb} MB limit.`));
  }
  next();
}
