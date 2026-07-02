/** Unit tests — aggregate upload-size guards (remediation Issue 2). */
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { enforceRequestSizeHeader, enforceAggregateUploadSize } from './upload-limit';
import { uploadConfig } from '@/config';
import { PayloadTooLargeError } from '@/shared/errors';

const MAX = uploadConfig.maxRequestBytes;
const res = {} as Response;

function reqWith(over: Partial<Request>): Request {
  return { headers: {}, path: '/admin/media', ...over } as Request;
}

describe('enforceRequestSizeHeader', () => {
  it('passes when Content-Length is within the cap', () => {
    const next = vi.fn();
    enforceRequestSizeHeader(reqWith({ headers: { 'content-length': String(MAX - 1) } }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when Content-Length exceeds the cap (413)', () => {
    const next = vi.fn();
    enforceRequestSizeHeader(reqWith({ headers: { 'content-length': String(MAX + 1) } }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeError));
  });

  it('passes when Content-Length is absent (chunked) — aggregate guard handles it', () => {
    const next = vi.fn();
    enforceRequestSizeHeader(reqWith({}), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('enforceAggregateUploadSize', () => {
  it('rejects when summed file sizes exceed the cap (413)', () => {
    const next = vi.fn();
    const files = [{ size: MAX }, { size: 1024 }];
    enforceAggregateUploadSize(reqWith({ files } as unknown as Partial<Request>), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeError));
  });

  it('passes when summed file sizes are within the cap', () => {
    const next = vi.fn();
    const file = { size: 1024 };
    enforceAggregateUploadSize(reqWith({ file } as unknown as Partial<Request>), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes with no files attached', () => {
    const next = vi.fn();
    enforceAggregateUploadSize(reqWith({}), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
