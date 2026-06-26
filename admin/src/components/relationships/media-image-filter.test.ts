import { describe, expect, it } from 'vitest';
import { keepImagesOnly } from './media-api';
import type { MediaItem } from './media-api';

/**
 * Issue 2 regression (Phase 15.7 remediation). The shared image picker must show ONLY image assets;
 * PDFs/DOCs and other non-image assets must never appear in image-selection dialogs (and never
 * produce broken thumbnails). The backend `mime_type` filter is exact-match, so this client-side
 * `image/*` filter is the documented fallback the picker relies on.
 */
function media(id: string, mime: string): MediaItem {
  return {
    id,
    url: `https://cdn/${id}`,
    file_name: `${id}.bin`,
    mime_type: mime,
    title: null,
    alt_text: null,
    caption: null,
    width: null,
    height: null,
  };
}

describe('keepImagesOnly', () => {
  it('keeps jpeg/png/webp/gif/svg image assets', () => {
    const items = [
      media('a', 'image/jpeg'),
      media('b', 'image/png'),
      media('c', 'image/webp'),
      media('d', 'image/gif'),
      media('e', 'image/svg+xml'),
    ];
    expect(keepImagesOnly(items).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('hides PDF assets', () => {
    const items = [media('img', 'image/jpeg'), media('doc', 'application/pdf')];
    const out = keepImagesOnly(items);
    expect(out.map((m) => m.id)).toEqual(['img']);
    expect(out.some((m) => m.mime_type === 'application/pdf')).toBe(false);
  });

  it('hides DOC / DOCX and other non-image assets', () => {
    const items = [
      media('img', 'image/png'),
      media('doc', 'application/msword'),
      media('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      media('xls', 'application/vnd.ms-excel'),
      media('vid', 'video/mp4'),
    ];
    expect(keepImagesOnly(items).map((m) => m.id)).toEqual(['img']);
  });

  it('blocks selection of non-image assets by removing them from the list entirely', () => {
    // A non-image cannot be picked because it never renders as a selectable option.
    const pdfOnly = keepImagesOnly([media('doc', 'application/pdf')]);
    expect(pdfOnly).toHaveLength(0);
  });

  it('tolerates a malformed/missing mime_type without throwing', () => {
    const items = [media('img', 'image/jpeg'), { ...media('weird', ''), mime_type: undefined as unknown as string }];
    expect(keepImagesOnly(items).map((m) => m.id)).toEqual(['img']);
  });
});
