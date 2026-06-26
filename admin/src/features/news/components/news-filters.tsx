'use client';

/**
 * News list filters. Exposes the backend's allow-listed news filters (news.query.ts):
 * publication_state, show_on_homepage, year, event, and search — all server-side. The `event`
 * filter is backed by the source-event relation (`parseNewsFilters` reads `q.event`); it reuses
 * the shared, paginated {@link RelationSelect} so a large event catalogue stays searchable
 * (Phase 15.3 remediation — Finding 5).
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { RelationSelect } from '@/components/relationships';

export const NEWS_FILTER_KEYS = ['publication_state', 'show_on_homepage', 'year', 'event'];

const PUBLICATION_STATES = [
  { value: '', label: 'All states' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

export function NewsFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search news…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="news-state">State</Label>
          <Select
            id="news-state"
            value={f.filters.publication_state ?? ''}
            onChange={(e) => f.setFilter('publication_state', e.target.value || undefined)}
            options={PUBLICATION_STATES}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="news-home">Homepage</Label>
          <Select
            id="news-home"
            value={f.filters.show_on_homepage ?? ''}
            onChange={(e) => f.setFilter('show_on_homepage', e.target.value || undefined)}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'On homepage' },
              { value: 'false', label: 'Not on homepage' },
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="news-year">Year</Label>
          <Input
            id="news-year"
            type="number"
            min={1900}
            max={3000}
            placeholder="Any"
            value={f.filters.year ?? ''}
            onChange={(e) => f.setFilter('year', e.target.value || undefined)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="news-event">Source event</Label>
          <RelationSelect
            id="news-event"
            resource="events"
            value={f.filters.event ?? ''}
            onChange={(v) => f.setFilter('event', v)}
            placeholder="Any event"
            searchPlaceholder="Search events…"
          />
        </div>
      </div>
    </div>
  );
}
