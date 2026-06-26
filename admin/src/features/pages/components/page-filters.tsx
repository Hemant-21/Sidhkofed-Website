'use client';

/**
 * Pages list filter bar. Exposes exactly the backend's allow-listed admin filters
 * (pages.query.ts): publication_state, show_on_homepage, plus search. All filtering is
 * server-side; no client-side logic.
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

const HOMEPAGE_OPTIONS = [
  { value: 'true', label: 'On homepage' },
  { value: 'false', label: 'Not on homepage' },
];

export const PAGE_FILTER_KEYS = ['publication_state', 'show_on_homepage'];

export function PageFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search pages…"
          className="sm:max-w-xs"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect
          label="State"
          id="page-filter-state"
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="Homepage"
          id="page-filter-homepage"
          value={sel('show_on_homepage')}
          onChange={(v) => f.setFilter('show_on_homepage', v)}
          options={HOMEPAGE_OPTIONS}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  id,
  value,
  onChange,
  options,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        options={[{ value: '', label: 'All' }, ...options]}
      />
    </div>
  );
}
