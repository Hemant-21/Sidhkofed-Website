'use client';

/**
 * Video list filter bar. Exposes EXACTLY the backend's allow-listed video filters
 * (video.controller.ts): publication_state and show_on_homepage, plus search. Filtering is
 * server-side via the shared `useFilters` controller. No client-side filtering.
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

/** The exact backend allow-list for video list filtering (video.controller.ts). */
export const VIDEO_FILTER_KEYS = ['publication_state', 'show_on_homepage'];

export function VideoFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search videos…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="space-y-1">
          <Label htmlFor="video-filter-state">State</Label>
          <Select
            id="video-filter-state"
            value={sel('publication_state')}
            onChange={(e) => f.setFilter('publication_state', e.target.value || undefined)}
            options={[{ value: '', label: 'All' }, ...PUBLICATION_STATES]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="video-filter-home">Homepage</Label>
          <Select
            id="video-filter-home"
            value={sel('show_on_homepage')}
            onChange={(e) => f.setFilter('show_on_homepage', e.target.value || undefined)}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'On homepage' },
              { value: 'false', label: 'Not on homepage' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
