import { describe, expect, it } from 'vitest';
import { buildPagePayload, emptyPageForm, type PageFormValues } from './page-form-payload';

/**
 * Payload regression (Phase 15.7). The generated payload must match the backend `pageCreateSchema`
 * EXACTLY (pages.validators.ts `baseShape` + `workflowShape`): bilingual title/body, page-only SEO
 * meta, ISO timestamps for scheduling/highlight, and NO unknown keys (the backend uses `.strict()`).
 * No cover image, parent, or media_ids — the backend does not accept them.
 */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'body_en',
  'body_hi',
  'meta_title_en',
  'meta_title_hi',
  'meta_description_en',
  'meta_description_hi',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<PageFormValues> = {}): PageFormValues {
  return { ...emptyPageForm(), title_en: 'About Us', ...overrides };
}

describe('buildPagePayload', () => {
  it('emits only keys the backend validator accepts (no unknown keys)', () => {
    const p = buildPagePayload(values({ body_en: 'Body' }));
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('never produces unsupported page fields (cover, parent, media)', () => {
    const p = buildPagePayload(values()) as Record<string, unknown>;
    expect(p).not.toHaveProperty('cover_media_id');
    expect(p).not.toHaveProperty('parent_page_id');
    expect(p).not.toHaveProperty('media_ids');
  });

  it('converts empty bilingual + meta content to null', () => {
    const p = buildPagePayload(values());
    expect(p.body_en).toBeNull();
    expect(p.body_hi).toBeNull();
    expect(p.meta_title_en).toBeNull();
    expect(p.meta_description_en).toBeNull();
  });

  it('only sends the highlight window when a highlight is active', () => {
    expect(buildPagePayload(values({ highlight_type: '', highlight_start_at: '2026-01-01' })).highlight_start_at).toBeNull();
    const active = buildPagePayload(values({ highlight_type: 'featured', highlight_start_at: '2026-01-01' }));
    expect(active.highlight_type).toBe('featured');
    expect(active.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('maps display order and scheduling correctly', () => {
    const p = buildPagePayload(values({ display_order: '3', publish_start_at: '2026-02-01' }));
    expect(p.display_order).toBe(3);
    expect(p.publish_start_at).toBe('2026-02-01T00:00:00.000Z');
  });

  it('never produces server-managed fields', () => {
    const p = buildPagePayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });
});
