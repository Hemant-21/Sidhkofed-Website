'use client';

/**
 * Media Library filter bar. Exposes EXACTLY the backend's allow-listed media filters
 * (media.validators.ts → mediaQuerySchema): mime_type (exact), archived, used_by (usage entity
 * type), and search. Filtering is server-side via the shared `useFilters` controller.
 */

import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';

/** The exact backend allow-list for media list filtering (media.validators.ts). */
export const MEDIA_FILTER_KEYS = ['mime_type', 'archived', 'used_by'];

// `mime_type` is an EXACT match on the backend, so offer the common stored types.
const MIME_TYPES = [
  { value: 'image/jpeg', label: 'JPEG image' },
  { value: 'image/png', label: 'PNG image' },
  { value: 'image/webp', label: 'WebP image' },
  { value: 'image/svg+xml', label: 'SVG image' },
  { value: 'application/pdf', label: 'PDF document' },
];

// `used_by` filters by usage entity type (media.repository.ts → usages.some.entityType).
const USED_BY = [
  { value: 'document', label: 'Documents' },
  { value: 'event', label: 'Events' },
  { value: 'event_news', label: 'News' },
  { value: 'gallery', label: 'Galleries' },
  { value: 'video', label: 'Videos' },
  { value: 'institution', label: 'Institutions' },
  { value: 'programme_scheme', label: 'Programmes' },
];

export function MediaFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={f.search} onValueChange={f.setSearch} placeholder="Search media by name, title, caption…" className="sm:max-w-xs" />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FilterSelect label="Type" value={sel('mime_type')} onChange={(v) => f.setFilter('mime_type', v)} options={MIME_TYPES} allLabel="All types" />
        <FilterSelect label="Used in" value={sel('used_by')} onChange={(v) => f.setFilter('used_by', v)} options={USED_BY} allLabel="Anywhere" />
        <FilterSelect
          label="Status"
          value={sel('archived')}
          onChange={(v) => f.setFilter('archived', v)}
          options={[
            { value: 'false', label: 'Active' },
            { value: 'true', label: 'Archived' },
          ]}
          allLabel="All"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  const id = `media-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)} options={[{ value: '', label: allLabel }, ...options]} />
    </div>
  );
}
