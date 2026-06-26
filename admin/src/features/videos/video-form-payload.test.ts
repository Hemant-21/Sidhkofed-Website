import { describe, expect, it } from 'vitest';
import { buildVideoPayload, emptyVideoForm, videoToForm, type VideoFormValues } from './video-form-payload';
import type { Video } from './types';

function values(overrides: Partial<VideoFormValues> = {}): VideoFormValues {
  return { ...emptyVideoForm(), title_en: 'Vid', youtube_url: 'https://youtu.be/abc', ...overrides };
}

describe('buildVideoPayload', () => {
  it('trims the title and the youtube url', () => {
    const p = buildVideoPayload(values({ title_en: '  Hi  ', youtube_url: '  https://youtu.be/abc  ' }));
    expect(p.title_en).toBe('Hi');
    expect(p.youtube_url).toBe('https://youtu.be/abc');
  });

  it('omits empty optional bilingual/description fields', () => {
    const p = buildVideoPayload(values({ title_hi: '', description_en: '' }));
    expect(p.title_hi).toBeUndefined();
    expect(p.description_en).toBeUndefined();
  });

  it('only includes display_order when provided', () => {
    expect(buildVideoPayload(values({ display_order: '2' })).display_order).toBe(2);
    expect('display_order' in buildVideoPayload(values({ display_order: '' }))).toBe(false);
  });

  it('never sends server-managed fields (slug, youtube_id, highlight, language)', () => {
    const p = buildVideoPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.youtube_id).toBeUndefined();
    expect(p.highlight_type).toBeUndefined();
    expect(p.language).toBeUndefined();
  });
});

describe('videoToForm', () => {
  it('hydrates editable fields from the detail', () => {
    const v = {
      title_en: 'V',
      title_hi: null,
      description_en: 'd',
      description_hi: null,
      youtube_url: 'https://youtu.be/abc',
      thumbnail_media_id: 'm1',
      public_visibility: true,
      show_on_homepage: true,
      display_order: 1,
    } as unknown as Video;
    const f = videoToForm(v);
    expect(f.youtube_url).toBe('https://youtu.be/abc');
    expect(f.thumbnail_media_id).toBe('m1');
    expect(f.display_order).toBe('1');
    expect(f.show_on_homepage).toBe(true);
  });
});
