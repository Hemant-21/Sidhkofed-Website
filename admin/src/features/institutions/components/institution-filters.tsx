'use client';

/**
 * Institution list filter bar. Exposes EXACTLY the backend's allow-listed institution filters
 * (institutions.query.ts): publication_state, institution_type, district, show_on_homepage.
 * Filtering is server-side via the shared `useFilters` controller — each control writes an
 * allow-listed query param and re-runs the backend query. No client-side filtering.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
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

/** The exact backend allow-list for institution list filtering (institutions.query.ts). */
export const INSTITUTION_FILTER_KEYS = ['publication_state', 'institution_type', 'district', 'show_on_homepage'];

export function InstitutionFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const institutionTypes = useMasterOptions('institution-types');
  const districts = useMasterOptions('districts');

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search institutions…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect label="State" value={sel('publication_state')} onChange={(v) => f.setFilter('publication_state', v)} options={PUBLICATION_STATES} />
        <FilterSelect label="Type" value={sel('institution_type')} onChange={(v) => f.setFilter('institution_type', v)} options={institutionTypes.options} />
        <FilterSelect label="District" value={sel('district')} onChange={(v) => f.setFilter('district', v)} options={districts.options} />
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
  const id = `inst-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)} options={[{ value: '', label: 'All' }, ...options]} />
    </div>
  );
}
