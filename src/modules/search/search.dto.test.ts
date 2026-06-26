/**
 * Unit tests — search result mapper (Phase 13). Pure. Verifies the lightweight result shape, the
 * per-surface public_url convention, and cover-media resolution.
 */
import { describe, it, expect } from 'vitest';
import { publicUrlFor, toSearchResultDto } from './search.dto';
import type { SearchRow } from './search.repository';
import type { MediaRef } from '@/modules/institutions/institutions.dto';

const row = (over: Partial<SearchRow> = {}): SearchRow => ({
  content_type: 'event',
  id: 'e1',
  slug: 'lac-training',
  title_en: 'Lac training',
  title_hi: null,
  summary: 'Two-day field training.',
  publication_date: '2026-02-10',
  cover_media_id: null,
  rank: 0.5,
  ...over,
});

describe('publicUrlFor', () => {
  it('maps every content type to its canonical detail route', () => {
    expect(publicUrlFor('event', 's')).toBe('/events/s');
    expect(publicUrlFor('news', 's')).toBe('/news/s');
    expect(publicUrlFor('programme', 's')).toBe('/programmes/s');
    expect(publicUrlFor('document', 's')).toBe('/documents/s');
    expect(publicUrlFor('official_communication', 's')).toBe('/official-communications/s');
    expect(publicUrlFor('tender', 's')).toBe('/tenders/s');
    expect(publicUrlFor('procurement_update', 's')).toBe('/procurement-updates/s');
    expect(publicUrlFor('page', 's')).toBe('/pages/s');
  });
});

describe('toSearchResultDto', () => {
  it('builds the lightweight result with a null cover when there is no cover media', () => {
    const dto = toSearchResultDto(row(), new Map());
    expect(dto).toEqual({
      content_type: 'event',
      id: 'e1',
      slug: 'lac-training',
      title_en: 'Lac training',
      title_hi: null,
      summary: 'Two-day field training.',
      publication_date: '2026-02-10',
      cover_media: null,
      public_url: '/events/lac-training',
    });
  });

  it('resolves the cover media reference from the batch map', () => {
    const ref: MediaRef = {
      id: 'm1', url: '/cdn/cover.jpg', file_name: 'cover.jpg', mime_type: 'image/jpeg',
      title: null, alt_text: 'Trainees', caption: null, width: 1600, height: 900,
    };
    const dto = toSearchResultDto(row({ cover_media_id: 'm1' }), new Map([['m1', ref]]));
    expect(dto.cover_media).toBe(ref);
  });

  it('leaves cover_media null when the id is absent from the map', () => {
    const dto = toSearchResultDto(row({ cover_media_id: 'missing' }), new Map());
    expect(dto.cover_media).toBeNull();
  });
});
