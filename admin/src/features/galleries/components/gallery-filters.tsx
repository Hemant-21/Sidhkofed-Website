'use client';

/**
 * Galleries list filter bar. Exposes exactly the backend's allow-listed filters (gallery.controller
 * list): publication_state, plus search. Server-side only — no client-side filtering.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';

const PUBLICATION_STATES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

export const GALLERY_FILTER_KEYS = ['publication_state'];

export function GalleryFilters({ filters }: { filters: FilterController }) {
  const f = filters;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search galleries…"
          className="sm:max-w-xs"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="gallery-filter-state">State</Label>
          <Select
            id="gallery-filter-state"
            value={f.filters.publication_state ?? ''}
            onChange={(e) => f.setFilter('publication_state', e.target.value || undefined)}
            options={[{ value: '', label: 'All' }, ...PUBLICATION_STATES]}
          />
        </div>
      </div>
    </div>
  );
}
