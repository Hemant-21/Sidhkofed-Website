'use client';

/**
 * Official Communications list filter bar. Exposes exactly the backend's allow-listed filters:
 * publication_state, communication_type, year, show_on_homepage, highlight.
 * All filtering is server-side; no client-side logic.
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

const HIGHLIGHT_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'latest', label: 'Latest' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'featured', label: 'Featured' },
];

export const COMMUNICATION_FILTER_KEYS = [
  'publication_state',
  'communication_type',
  'year',
  'show_on_homepage',
  'highlight',
];

export function CommunicationFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const communicationTypes = useMasterOptions('communication-types');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search communications…"
          className="sm:max-w-xs"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="State"
          id="comm-filter-state"
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="Type"
          id="comm-filter-type"
          value={sel('communication_type')}
          onChange={(v) => f.setFilter('communication_type', v)}
          options={communicationTypes.options}
        />
        <FilterSelect
          label="Homepage"
          id="comm-filter-homepage"
          value={sel('show_on_homepage')}
          onChange={(v) => f.setFilter('show_on_homepage', v)}
          options={HOMEPAGE_OPTIONS}
        />
        <FilterSelect
          label="Highlight"
          id="comm-filter-highlight"
          value={sel('highlight')}
          onChange={(v) => f.setFilter('highlight', v)}
          options={HIGHLIGHT_OPTIONS}
        />
        <div className="space-y-1">
          <Label htmlFor="comm-filter-year">Year</Label>
          <Input
            id="comm-filter-year"
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
