'use client';

/**
 * Programme list filter bar. Exposes EXACTLY the backend's allow-listed programme filters
 * (programmes.query.ts): publication_state, commodity, show_on_homepage, year. Filtering is
 * server-side via the shared `useFilters` controller — each control writes an allow-listed query
 * param and re-runs the backend query. No client-side filtering.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { useMasterOptions } from '@/components/relationships';

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

/** The exact backend allow-list for programme list filtering (programmes.query.ts). */
export const PROGRAMME_FILTER_KEYS = ['publication_state', 'commodity', 'show_on_homepage', 'year'];

export function ProgrammeFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const commodities = useMasterOptions('commodities');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search programmes…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect label="State" value={sel('publication_state')} onChange={(v) => f.setFilter('publication_state', v)} options={PUBLICATION_STATES} />
        <FilterSelect label="Commodity" value={sel('commodity')} onChange={(v) => f.setFilter('commodity', v)} options={commodities.options} />
        <FilterSelect label="Homepage" value={sel('show_on_homepage')} onChange={(v) => f.setFilter('show_on_homepage', v)} options={HOMEPAGE_OPTIONS} />
        <div className="space-y-1">
          <Label htmlFor="programme-year-filter">Year (start)</Label>
          <Input
            id="programme-year-filter"
            type="number"
            inputMode="numeric"
            min={1900}
            max={3000}
            placeholder="Any"
            value={sel('year')}
            onChange={(e) => f.setFilter('year', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const id = `prog-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)} options={[{ value: '', label: 'All' }, ...options]} />
    </div>
  );
}
