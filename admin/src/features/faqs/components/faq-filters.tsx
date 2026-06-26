'use client';

/**
 * FAQ list filter bar. Exposes exactly the backend's allow-listed admin filters (faqs.query.ts):
 * faq_category, publication_state, show_on_homepage, plus search. All filtering is server-side.
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

export const FAQ_FILTER_KEYS = ['faq_category', 'publication_state', 'show_on_homepage'];

export function FaqFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const categories = useMasterOptions('faq-categories');
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search questions & answers…"
          className="sm:max-w-xs"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FilterSelect
          label="Category"
          id="faq-filter-category"
          value={sel('faq_category')}
          onChange={(v) => f.setFilter('faq_category', v)}
          options={categories.options}
        />
        <FilterSelect
          label="State"
          id="faq-filter-state"
          value={sel('publication_state')}
          onChange={(v) => f.setFilter('publication_state', v)}
          options={PUBLICATION_STATES}
        />
        <FilterSelect
          label="Homepage"
          id="faq-filter-homepage"
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
