import { describe, expect, it } from 'vitest';
import { buildGalleryPayload, emptyGalleryForm, type GalleryFormValues } from './gallery-form-payload';

/**
 * Payload regression (Phase 15.7 remediation — Issue 1). Must match the backend `galleryCreateSchema`
 * (gallery.validators.ts): title/description bilingual, nullable `cover_media_id`, optional int
 * `display_order`. The optional string fields are NOT nullable on the backend, so we send strings
 * (never null); display_order is OMITTED when blank (null would be rejected).
 */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'description_en',
  'description_hi',
  'cover_media_id',
  'public_visibility',
  'show_on_homepage',
  'display_order',
]);

function values(overrides: Partial<GalleryFormValues> = {}): GalleryFormValues {
  return { ...emptyGalleryForm(), title_en: 'Field day', ...overrides };
}

describe('buildGalleryPayload', () => {
  it('emits only keys the backend validator accepts', () => {
    const p = buildGalleryPayload(values({ display_order: '1' }));
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('sends empty optional strings as strings, never null (backend optional-not-nullable)', () => {
    const p = buildGalleryPayload(values());
    expect(p.title_hi).toBe('');
    expect(p.description_en).toBe('');
    expect(p.description_hi).toBe('');
  });

  it('omits display_order when blank and includes it when set', () => {
    expect(buildGalleryPayload(values())).not.toHaveProperty('display_order');
    expect(buildGalleryPayload(values({ display_order: '4' })).display_order).toBe(4);
  });

  it('passes cover_media_id through (nullable) and clears to null', () => {
    expect(buildGalleryPayload(values()).cover_media_id).toBeNull();
    expect(buildGalleryPayload(values({ cover_media_id: 'm1' })).cover_media_id).toBe('m1');
  });

  it('never produces server-managed fields', () => {
    const p = buildGalleryPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.images).toBeUndefined();
  });
});
