'use client';

/**
 * Membership list filter bar. Exposes the backend's allow-listed admin filters
 * (memberships.query.ts): membership_level, membership_type, status, publication_state, district.
 * All filtering is server-side.
 */

import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { useMasterOptions } from '@/components/relationships';
import {
  MEMBERSHIP_LEVELS,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
} from '../types';

export const MEMBERSHIP_FILTER_KEYS = ['membership_level', 'membership_type', 'status', 'publication_state', 'district'];

const PUBLICATION_STATES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

export function MembershipFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const districts = useMasterOptions('districts');
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      {f.isActive ? (
        <Button variant="ghost" size="sm" onClick={f.reset}>
          Clear filters
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="Level"
          id="m-filter-level"
          value={sel('membership_level')}
          onChange={(v) => f.setFilter('membership_level', v)}
          options={MEMBERSHIP_LEVELS.map((l) => ({ value: l, label: MEMBERSHIP_LEVEL_LABEL[l] }))}
        />
        <FilterSelect
          label="Type"
          id="m-filter-type"
          value={sel('membership_type')}
          onChange={(v) => f.setFilter('membership_type', v)}
          options={MEMBERSHIP_TYPES.map((t) => ({ value: t, label: MEMBERSHIP_TYPE_LABEL[t] }))}
        />
        <FilterSelect
          label="Member status"
          id="m-filter-status"
          value={sel('status')}
          onChange={(v) => f.setFilter('status', v)}
          options={MEMBERSHIP_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="State"
          id="m-filter-state"
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="District"
          id="m-filter-district"
          value={sel('district')}
          onChange={(v) => f.setFilter('district', v)}
          options={districts.options.map((o) => ({ value: o.value, label: o.label }))}
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
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)} options={[{ value: '', label: 'All' }, ...options]} />
    </div>
  );
}
