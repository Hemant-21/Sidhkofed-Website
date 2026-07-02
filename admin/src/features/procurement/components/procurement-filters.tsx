'use client';

/**
 * Procurement Updates list filter bar. Exposes exactly the backend's allow-listed filters:
 * publication_state, procurement_update_type, commodity, programme, district, year,
 * show_on_homepage, status. All filtering is server-side.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { useMasterOptions, RelationSelect } from '@/components/relationships';

const PUBLICATION_STATES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'upcoming', label: 'Upcoming' },
];

const HOMEPAGE_OPTIONS = [
  { value: 'true', label: 'On homepage' },
  { value: 'false', label: 'Not on homepage' },
];

export const PROCUREMENT_FILTER_KEYS = [
  'publication_state',
  'procurement_update_type',
  'commodity',
  'programme',
  'district',
  'year',
  'show_on_homepage',
  'status',
];

export function ProcurementFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const procTypes = useMasterOptions('procurement-update-types');
  const commodities = useMasterOptions('commodities');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search procurement updates…"
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
          id="proc-filter-state"
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="Update type"
          id="proc-filter-type"
          value={sel('procurement_update_type')}
          onChange={(v) => f.setFilter('procurement_update_type', v)}
          options={procTypes.options}
        />
        <FilterSelect
          label="Commodity"
          id="proc-filter-commodity"
          value={sel('commodity')}
          onChange={(v) => f.setFilter('commodity', v)}
          options={commodities.options}
        />
        <FilterSelect
          label="Status"
          id="proc-filter-status"
          value={sel('status')}
          onChange={(v) => f.setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Homepage"
          id="proc-filter-homepage"
          value={sel('show_on_homepage')}
          onChange={(v) => f.setFilter('show_on_homepage', v)}
          options={HOMEPAGE_OPTIONS}
        />
        <div className="space-y-1">
          <Label htmlFor="proc-filter-district">District</Label>
          <RelationSelect
            id="proc-filter-district"
            resource="districts"
            value={sel('district')}
            onChange={(v) => f.setFilter('district', v)}
            placeholder="All districts"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="proc-filter-programme">Programme</Label>
          <RelationSelect
            id="proc-filter-programme"
            resource="programmes"
            value={sel('programme')}
            onChange={(v) => f.setFilter('programme', v)}
            placeholder="All programmes"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="proc-filter-year">Year</Label>
          <Input
            id="proc-filter-year"
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
