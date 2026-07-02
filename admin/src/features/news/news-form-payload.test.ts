import { describe, expect, it } from 'vitest';
import { buildNewsPayload, newsToForm, type NewsFormValues } from './news-form-payload';
import type { NewsDetail } from './types';

function values(overrides: Partial<NewsFormValues> = {}): NewsFormValues {
  return {
    title_en: 'News',
    title_hi: '',
    summary_en: '',
    summary_hi: '',
    body_en: '',
    body_hi: '',
    cover_media_id: null,
    news_published_at: '',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
    ...overrides,
  };
}

describe('buildNewsPayload', () => {
  it('trims the title and nulls empty editorial fields', () => {
    const p = buildNewsPayload(values({ title_en: '  Hello  ', summary_en: '', body_en: '' }));
    expect(p.title_en).toBe('Hello');
    expect(p.summary_en).toBeNull();
    expect(p.body_en).toBeNull();
  });

  it('widens news_published_at to an ISO timestamp', () => {
    expect(buildNewsPayload(values({ news_published_at: '2026-03-01' })).news_published_at).toBe('2026-03-01T00:00:00.000Z');
    expect(buildNewsPayload(values({ news_published_at: '' })).news_published_at).toBeNull();
  });

  it('drops highlight window without a highlight', () => {
    const p = buildNewsPayload(values({ highlight_type: '', highlight_start_at: '2026-01-01' }));
    expect(p.highlight_type).toBeNull();
    expect(p.highlight_start_at).toBeNull();
  });

  it('never sets event_id (immutable link)', () => {
    const p = buildNewsPayload(values()) as Record<string, unknown>;
    expect(p.event_id).toBeUndefined();
  });
});

describe('newsToForm', () => {
  it('hydrates editable fields and the date-only slices', () => {
    const detail = {
      title_en: 'N',
      title_hi: null,
      summary_en: 'S',
      summary_hi: null,
      body_en: '<p>x</p>',
      body_hi: null,
      cover_media: { id: 'm1', url: 'u' },
      news_published_at: '2026-03-01T10:00:00.000Z',
      highlight_type: null,
      highlight_start_at: null,
      highlight_end_at: null,
      display_order: null,
      publish_start_at: null,
      public_visibility: true,
      show_on_homepage: false,
    } as unknown as NewsDetail;
    const f = newsToForm(detail);
    expect(f.cover_media_id).toBe('m1');
    expect(f.news_published_at).toBe('2026-03-01');
    expect(f.body_en).toBe('<p>x</p>');
    expect(f.public_visibility).toBe(true);
  });
});
