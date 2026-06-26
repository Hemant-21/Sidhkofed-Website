'use client';

/**
 * Toolkit list filter bar. Exposes EXACTLY the backend's allow-listed toolkit filters
 * (toolkits.query.ts): publication_state, commodity, programme, show_on_homepage. The programme
 * filter uses the shared server-side RelationSelect (programmes can exceed one page); the commodity
 * filter is a bounded master dropdown. Filtering is server-side via the shared `useFilters`
 * controller. No client-side filtering.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
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

const HOMEPAGE_OPTIONS = [
  { value: 'true', label: 'On homepage' },
  { value: 'false', label: 'Not on homepage' },
];

/** The exact backend allow-list for toolkit list filtering (toolkits.query.ts). */
export const TOOLKIT_FILTER_KEYS = ['publication_state', 'commodity', 'programme', 'show_on_homepage'];

export function ToolkitFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const commodities = useMasterOptions('commodities');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search toolkits…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect label="State" value={sel('publication_state')} onChange={(v) => f.setFilter('publication_state', v)} options={PUBLICATION_STATES} />
        <FilterSelect label="Commodity" value={sel('commodity')} onChange={(v) => f.setFilter('commodity', v)} options={commodities.options} />
        <div className="space-y-1">
          <Label htmlFor="toolkit-filter-programme">Programme</Label>
          <RelationSelect
            id="toolkit-filter-programme"
            resource="programmes"
            value={sel('programme')}
            onChange={(v) => f.setFilter('programme', v)}
            placeholder="All programmes"
            searchPlaceholder="Search programmes…"
          />
        </div>
        <FilterSelect label="Homepage" value={sel('show_on_homepage')} onChange={(v) => f.setFilter('show_on_homepage', v)} options={HOMEPAGE_OPTIONS} />
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
  const id = `toolkit-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)} options={[{ value: '', label: 'All' }, ...options]} />
    </div>
  );
}
