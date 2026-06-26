import { describe, expect, it } from 'vitest';
import { isImage } from './types';

describe('isImage', () => {
  it('is true for image mime types', () => {
    expect(isImage({ mime_type: 'image/png' })).toBe(true);
    expect(isImage({ mime_type: 'image/svg+xml' })).toBe(true);
  });

  it('is false for non-image mime types', () => {
    expect(isImage({ mime_type: 'application/pdf' })).toBe(false);
    expect(isImage({ mime_type: 'video/mp4' })).toBe(false);
  });
});
