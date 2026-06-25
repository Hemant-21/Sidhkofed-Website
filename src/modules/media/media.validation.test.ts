/** Unit tests — media file validation (magic bytes, size, mime/extension, dimensions). */
import { describe, it, expect } from 'vitest';
import { detectFamily, validateUpload, computeChecksum, readImageDimensions } from './media.validation';
import { UnsupportedFileTypeError, ValidationError } from '@/shared/errors';

/** Minimal 1x1 PNG header (IHDR with width=1,height=1). */
function pngBuffer(width = 1, height = 1): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0); // signature start
  buf.writeUInt32BE(0x0d0a1a0a, 4);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}
const pdfBuffer = Buffer.from('%PDF-1.7\n...', 'ascii');
const limits = { maxImageBytes: 1024 * 1024, maxDocumentBytes: 5 * 1024 * 1024 };

describe('detectFamily', () => {
  it('detects png and pdf', () => {
    expect(detectFamily(pngBuffer())).toBe('png');
    expect(detectFamily(pdfBuffer)).toBe('pdf');
    expect(detectFamily(Buffer.from('PK\x03\x04zip'))).toBe('zip');
    expect(detectFamily(Buffer.from('<svg xmlns=...'))).toBe('svg');
  });
});

describe('validateUpload', () => {
  it('accepts a valid png and reads dimensions', () => {
    const res = validateUpload({ buffer: pngBuffer(120, 80), originalName: 'logo.png', declaredMime: 'image/png', ...limits });
    expect(res.mimeType).toBe('image/png');
    expect(res.category).toBe('image');
    expect(res.width).toBe(120);
    expect(res.height).toBe(80);
  });

  it('accepts a valid pdf as a document', () => {
    const res = validateUpload({ buffer: pdfBuffer, originalName: 'report.pdf', declaredMime: 'application/pdf', ...limits });
    expect(res.category).toBe('document');
  });

  it('rejects an unsupported mime type', () => {
    expect(() => validateUpload({ buffer: pngBuffer(), originalName: 'x.exe', declaredMime: 'application/x-msdownload', ...limits })).toThrow(UnsupportedFileTypeError);
  });

  it('rejects an extension that does not match the mime', () => {
    expect(() => validateUpload({ buffer: pngBuffer(), originalName: 'logo.jpg', declaredMime: 'image/png', ...limits })).toThrow(ValidationError);
  });

  it('rejects content whose magic bytes contradict the declared type', () => {
    expect(() => validateUpload({ buffer: pdfBuffer, originalName: 'fake.png', declaredMime: 'image/png', ...limits })).toThrow(UnsupportedFileTypeError);
  });

  it('rejects a file over the size limit', () => {
    const big = Buffer.concat([pngBuffer(), Buffer.alloc(2 * 1024 * 1024)]);
    expect(() => validateUpload({ buffer: big, originalName: 'big.png', declaredMime: 'image/png', ...limits })).toThrow(ValidationError);
  });

  it('rejects an empty file', () => {
    expect(() => validateUpload({ buffer: Buffer.alloc(0), originalName: 'empty.png', declaredMime: 'image/png', ...limits })).toThrow(ValidationError);
  });
});

describe('computeChecksum / readImageDimensions', () => {
  it('produces a stable sha256 hex', () => {
    expect(computeChecksum(Buffer.from('hello'))).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
  it('returns null dims for non-images', () => {
    expect(readImageDimensions(pdfBuffer, 'application/pdf')).toEqual({ width: null, height: null });
  });
});
