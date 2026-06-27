'use client';

/**
 * Institutional Membership list filter bar. Exposes EXACTLY the backend's allow-listed admin
 * filters (memberships.query.ts ADMIN_FILTER_KEYS): publication_state, membership_level,
 * membership_type, status, district, reporting_period, institution, district_union, show_on_homepage,
 * year. All filtering is server-side via the shared `useFilters` controller; there is no client-side
 * filtering.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import {
  useMasterOptions,
  useReportingPeriodOptions,
  RelationSelect,
} from '@/components/relationships';
import {
  MEMBERSHIP_LEVELS,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  MEMBERSHIP_STATUS_LABEL,
} from '../types';

const PUBLICATION_STATES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

const LEVEL_OPTIONS = MEMBERSHIP_LEVELS.map((v) => ({ value: v, label: MEMBERSHIP_LEVEL_LABEL[v] }));
const TYPE_OPTIONS = MEMBERSHIP_TYPES.map((v) => ({ value: v, label: MEMBERSHIP_TYPE_LABEL[v] }));
const STATUS_OPTIONS = MEMBERSHIP_STATUSES.map((v) => ({
  value: v,
  label: MEMBERSHIP_STATUS_LABEL[v],
}));

const HOMEPAGE_OPTIONS = [
  { value: 'true', label: 'On homepage' },
  { value: 'false', label: 'Not on homepage' },
];

/** The exact backend allow-list for membership list filtering (memberships.query.ts). */
export const MEMBERSHIP_FILTER_KEYS = [
  'publication_state',
  'membership_level',
  'membership_type',
  'status',
  'district',
  'reporting_period',
  'institution',
  'district_union',
  'show_on_homepage',
  'year',
];

export function MembershipFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const districts = useMasterOptions('districts');
  const reportingPeriods = useReportingPeriodOptions();

  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search memberships…"
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
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="Level"
          value={sel('membership_level')}
          onChange={(v) => f.setFilter('membership_level', v)}
          options={LEVEL_OPTIONS}
        />
        <FilterSelect
          label="Type"
          value={sel('membership_type')}
          onChange={(v) => f.setFilter('membership_type', v)}
          options={TYPE_OPTIONS}
        />
        <FilterSelect
          label="Status"
          value={sel('status')}
          onChange={(v) => f.setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="District"
          value={sel('district')}
          onChange={(v) => f.setFilter('district', v)}
          options={districts.options}
        />
        <FilterSelect
          label="Reporting period"
          value={sel('reporting_period')}
          onChange={(v) => f.setFilter('reporting_period', v)}
          options={reportingPeriods.options}
        />
        <div className="space-y-1">
          <Label htmlFor="mem-filter-institution">Institution</Label>
          <RelationSelect
            id="mem-filter-institution"
            resource="institutions"
            value={sel('institution')}
            onChange={(v) => f.setFilter('institution', v)}
            placeholder="Any institution"
            searchPlaceholder="Search institutions…"
            publicationState="all"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-filter-du">District Union</Label>
          <RelationSelect
            id="mem-filter-du"
            resource="institutions"
            value={sel('district_union')}
            onChange={(v) => f.setFilter('district_union', v)}
            placeholder="Any district union"
            searchPlaceholder="Search institutions…"
            publicationState="all"
          />
        </div>
        <FilterSelect
          label="Homepage"
          value={sel('show_on_homepage')}
          onChange={(v) => f.setFilter('show_on_homepage', v)}
          options={HOMEPAGE_OPTIONS}
        />
        <div className="space-y-1">
          <Label htmlFor="mem-filter-year">Year (joined)</Label>
          <Input
            id="mem-filter-year"
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
  const id = `mem-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
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
