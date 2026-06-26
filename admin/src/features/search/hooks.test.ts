import { describe, expect, it } from 'vitest';
import { groupResultsByType, isSearchable } from './hooks';
import { CONTENT_TYPE_ORDER } from './content-type-meta';
import type { SearchResult } from '@/types/search';

function result(content_type: SearchResult['content_type'], id: string): SearchResult {
  return {
    content_type,
    id,
    slug: `${content_type}-${id}`,
    title_en: `${content_type} ${id}`,
    title_hi: null,
    summary: null,
    publication_date: null,
    cover_media: null,
    public_url: `/${content_type}/${id}`,
  };
}

describe('isSearchable', () => {
  it('requires at least the backend minimum length (trimmed)', () => {
    expect(isSearchable('')).toBe(false);
    expect(isSearchable(' a ')).toBe(false);
    expect(isSearchable('la')).toBe(true);
    expect(isSearchable('  lac  ')).toBe(true);
  });
});

describe('groupResultsByType', () => {
  it('groups results by content type and preserves the canonical type order', () => {
    const results = [
      result('document', '1'),
      result('event', '1'),
      result('document', '2'),
      result('page', '1'),
    ];
    const groups = groupResultsByType(results);

    expect(groups.map((g) => g.type)).toEqual(['event', 'document', 'page']);
    expect(groups[0]!.results).toHaveLength(1); // event
    expect(groups[1]!.results.map((r) => r.id)).toEqual(['1', '2']); // documents, ranking order kept
  });

  it('only includes groups that have results', () => {
    const groups = groupResultsByType([result('tender', '1')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.type).toBe('tender');
  });

  it('returns an empty array for no results', () => {
    expect(groupResultsByType([])).toEqual([]);
  });

  it('the canonical order covers every searchable content type', () => {
    expect(CONTENT_TYPE_ORDER).toHaveLength(8);
  });
});
