import { describe, expect, it } from 'vitest';
import {
  buildLeadershipPayload,
  emptyLeadershipForm,
  type LeadershipFormValues,
} from './leadership-form-payload';

/**
 * Payload regression (mirrors digital-services). Must match the backend `leadershipCreateSchema`
 * EXACTLY (leadership.validators.ts): three bilingual pairs (name/govt_role/sidhkofed_role),
 * optional `photo_media_id`, workflow fields, and NO unknown keys (`.strict()`). No `external_url`,
 * no `show_on_homepage` — those fields don't exist on this entity.
 */
const BACKEND_KEYS = new Set([
  'name_en',
  'name_hi',
  'govt_role_en',
  'govt_role_hi',
  'sidhkofed_role_en',
  'sidhkofed_role_hi',
  'photo_media_id',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
]);

function values(overrides: Partial<LeadershipFormValues> = {}): LeadershipFormValues {
  return {
    ...emptyLeadershipForm(),
    name_en: 'A. K. Sharma',
    govt_role_en: 'District Collector',
    sidhkofed_role_en: 'Chairperson',
    ...overrides,
  };
}

describe('buildLeadershipPayload', () => {
  it('emits only keys the backend validator accepts', () => {
    const p = buildLeadershipPayload(values());
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('never emits external_url or show_on_homepage', () => {
    const p = buildLeadershipPayload(values()) as Record<string, unknown>;
    expect(p.external_url).toBeUndefined();
    expect(p.show_on_homepage).toBeUndefined();
  });

  it('keeps the trimmed names/roles and the photo id (or null)', () => {
    expect(buildLeadershipPayload(values({ name_en: ' A. K. Sharma ' })).name_en).toBe('A. K. Sharma');
    expect(buildLeadershipPayload(values()).photo_media_id).toBeNull();
    expect(buildLeadershipPayload(values({ photo_media_id: 'm1' })).photo_media_id).toBe('m1');
  });

  it('converts empty bilingual fields to null', () => {
    const p = buildLeadershipPayload(values());
    expect(p.name_hi).toBeNull();
    expect(p.govt_role_hi).toBeNull();
    expect(p.sidhkofed_role_hi).toBeNull();
  });

  it('only sends the highlight window when a highlight is active', () => {
    const active = buildLeadershipPayload(
      values({ highlight_type: 'important', highlight_start_at: '2026-01-01' }),
    );
    expect(active.highlight_type).toBe('important');
    expect(active.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
    expect(
      buildLeadershipPayload(values({ highlight_type: '', highlight_end_at: '2026-02-01' })).highlight_end_at,
    ).toBeNull();
  });

  it('never produces server-managed fields', () => {
    const p = buildLeadershipPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
  });
});
