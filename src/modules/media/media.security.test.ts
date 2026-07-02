/**
 * Pre-Phase-5 audit regression tests: upload security (Issue 3), policy enforcement
 * (Issue 4), and the honest malware-scan contract (Issue 3).
 */
import { describe, it, expect } from 'vitest';
import { validateUpload, MEDIA_TYPE_REGISTRY, detectFamily } from './media.validation';
import { runMalwareScan, setMalwareScanner } from './media.scanner';
import { UnsupportedFileTypeError } from '@/shared/errors';

const limits = { maxImageBytes: 1024 * 1024, maxDocumentBytes: 5 * 1024 * 1024 };
function png(): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(0x0d0a1a0a, 4);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(1, 16);
  buf.writeUInt32BE(1, 20);
  return buf;
}

describe('upload security (Issue 3)', () => {
  it('no longer registers SVG as an accepted type', () => {
    expect(MEDIA_TYPE_REGISTRY['image/svg+xml']).toBeUndefined();
  });

  it('rejects SVG/XML byte content even when declared as PNG', () => {
    const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectFamily(svg)).toBe('svg');
    expect(() =>
      validateUpload({ buffer: svg, originalName: 'x.png', declaredMime: 'image/png', ...limits }),
    ).toThrow(UnsupportedFileTypeError);
  });
});

describe('upload policy enforcement (Issue 4)', () => {
  it('rejects a type that is not on the configured allow-list', () => {
    expect(() =>
      validateUpload({
        buffer: png(),
        originalName: 'logo.png',
        declaredMime: 'image/png',
        allowedMimeTypes: ['image/jpeg'], // png not permitted by policy
        ...limits,
      }),
    ).toThrow(UnsupportedFileTypeError);
  });

  it('accepts a type that IS on the configured allow-list', () => {
    const res = validateUpload({
      buffer: png(),
      originalName: 'logo.png',
      declaredMime: 'image/png',
      allowedMimeTypes: ['image/png', 'image/jpeg'],
      ...limits,
    });
    expect(res.mimeType).toBe('image/png');
  });
});

describe('malware scan honesty (Issue 3)', () => {
  it('marks uploads unscanned (never clean) when scanning is disabled', async () => {
    const result = await runMalwareScan(Buffer.from('x'), { enabled: false });
    expect(result.status).toBe('unscanned');
  });

  it('returns unconfigured (never clean) when enabled but no engine is wired', async () => {
    const result = await runMalwareScan(Buffer.from('x'), { enabled: true });
    expect(result.status).toBe('unconfigured');
    expect(result.status).not.toBe('clean');
  });

  it('uses a real scanner when one is installed', async () => {
    setMalwareScanner({ name: 'test', scan: async () => ({ status: 'clean', scanner: 'test' }) });
    const result = await runMalwareScan(Buffer.from('x'), { enabled: true });
    expect(result.status).toBe('clean');
    // restore default so other suites see the honest unconfigured engine
    setMalwareScanner({ name: 'unconfigured', scan: async () => ({ status: 'unconfigured', scanner: 'unconfigured' }) });
  });
});
