import { describe, expect, it } from 'vitest';
import {
  buildDigitalServicePayload,
  emptyDigitalServiceForm,
  type DigitalServiceFormValues,
} from './digital-service-form-payload';

/**
 * Payload regression (Phase 15.7). Must match the backend `digitalServiceCreateSchema` EXACTLY
 * (digital-services.validators.ts): title/description bilingual, required `external_url`, optional
 * `icon_media_id`, workflow fields, and NO unknown keys (`.strict()`).
 */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'description_en',
  'description_hi',
  'external_url',
  'icon_media_id',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<DigitalServiceFormValues> = {}): DigitalServiceFormValues {
  return {
    ...emptyDigitalServiceForm(),
    title_en: 'ERP',
    external_url: 'https://erp.example.gov.in',
    ...overrides,
  };
}

describe('buildDigitalServicePayload', () => {
  it('emits only keys the backend validator accepts', () => {
    const p = buildDigitalServicePayload(values());
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('keeps the external url trimmed and the icon id (or null)', () => {
    expect(buildDigitalServicePayload(values({ external_url: ' https://x.gov.in ' })).external_url).toBe(
      'https://x.gov.in',
    );
    expect(buildDigitalServicePayload(values()).icon_media_id).toBeNull();
    expect(buildDigitalServicePayload(values({ icon_media_id: 'm1' })).icon_media_id).toBe('m1');
  });

  it('converts empty bilingual description to null', () => {
    const p = buildDigitalServicePayload(values());
    expect(p.description_en).toBeNull();
    expect(p.description_hi).toBeNull();
  });

  it('only sends the highlight window when a highlight is active', () => {
    const active = buildDigitalServicePayload(values({ highlight_type: 'important', highlight_start_at: '2026-01-01' }));
    expect(active.highlight_type).toBe('important');
    expect(active.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
    expect(buildDigitalServicePayload(values({ highlight_type: '', highlight_end_at: '2026-02-01' })).highlight_end_at).toBeNull();
  });

  it('never produces server-managed fields', () => {
    const p = buildDigitalServicePayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
  });
});
