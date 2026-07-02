'use client';

/**
 * Event list filter bar. Exposes EXACTLY the backend's allow-listed event filters (events.query.ts):
 * publication_state, event_status, event_type, district, commodity, programme, institution,
 * show_on_homepage, year. Filtering is server-side via the shared `useFilters` controller — each
 * control writes an allow-listed query param and re-runs the backend query.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { useMasterOptions, RelationSelect } from '@/components/relationships';
import { EVENT_STATUS_OPTIONS } from '../event-status';

const PUBLICATION_STATES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

/** The exact backend allow-list for event list filtering (events.query.ts). */
export const EVENT_FILTER_KEYS = [
  'publication_state',
  'event_status',
  'event_type',
  'district',
  'block',
  'commodity',
  'programme',
  'institution',
  'show_on_homepage',
  'year',
];

export function EventFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const districtFilter = f.filters.district;
  const eventTypes = useMasterOptions('event-types');
  const districts = useMasterOptions('districts');
  // Blocks belong to a district — only offered once a district filter is chosen.
  const blocks = useMasterOptions('blocks', { districtId: districtFilter || null, enabled: Boolean(districtFilter) });
  const commodities = useMasterOptions('commodities');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search events…"
          className="sm:max-w-xs"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect label="State" value={sel('publication_state')} onChange={(v) => f.setFilter('publication_state', v)} options={PUBLICATION_STATES} />
        <FilterSelect label="Status" value={sel('event_status')} onChange={(v) => f.setFilter('event_status', v)} options={EVENT_STATUS_OPTIONS} />
        <FilterSelect label="Type" value={sel('event_type')} onChange={(v) => f.setFilter('event_type', v)} options={eventTypes.options} />
        <FilterSelect
          label="District"
          value={sel('district')}
          onChange={(v) => {
            f.setFilter('district', v);
            if (!v) f.setFilter('block', undefined); // clear dependent block when district cleared
          }}
          options={districts.options}
        />
        <div className="space-y-1">
          <Label htmlFor="filter-block">Block</Label>
          <Select
            id="filter-block"
            value={sel('block')}
            disabled={!districtFilter}
            onChange={(e) => f.setFilter('block', e.target.value || undefined)}
            options={[{ value: '', label: districtFilter ? 'All' : 'Select a district' }, ...blocks.options]}
          />
        </div>
        <FilterSelect label="Commodity" value={sel('commodity')} onChange={(v) => f.setFilter('commodity', v)} options={commodities.options} />
        <div className="space-y-1">
          <Label htmlFor="filter-programme">Programme</Label>
          <RelationSelect
            id="filter-programme"
            resource="programmes"
            value={sel('programme')}
            onChange={(v) => f.setFilter('programme', v)}
            placeholder="All"
            searchPlaceholder="Search programmes…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-institution">Institution</Label>
          <RelationSelect
            id="filter-institution"
            resource="institutions"
            value={sel('institution')}
            onChange={(v) => f.setFilter('institution', v)}
            placeholder="All"
            searchPlaceholder="Search institutions…"
          />
        </div>
        <FilterSelect
          label="Homepage"
          value={sel('show_on_homepage')}
          onChange={(v) => f.setFilter('show_on_homepage', v)}
          options={[
            { value: 'true', label: 'On homepage' },
            { value: 'false', label: 'Not on homepage' },
          ]}
        />
        <div className="space-y-1">
          <Label htmlFor="event-year-filter">Year</Label>
          <Input
            id="event-year-filter"
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
  const id = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        options={[{ value: '', label: `All` }, ...options]}
      />
    </div>
  );
}
