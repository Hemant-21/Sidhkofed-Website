'use client';

/**
 * Search filters (Phase 15.2). Exposes EXACTLY the backend's allow-listed,
 * non-relation search filters — content type (multi-select) and publication year.
 * (commodity/district/programme are backend relation filters; they plug in here
 * via the shared master selector when those master lists are wired in a module
 * phase.) Filtering is server-side: changing a control re-runs the backend query.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTENT_TYPES, type ContentType } from '@/types/search';
import { CONTENT_TYPE_META } from '../content-type-meta';
import { cn } from '@/utils/cn';

export interface SearchFilterValue {
  /** Selected content types (empty = all surfaces). */
  contentTypes: ContentType[];
  year: string;
}

export function SearchFilters({
  value,
  onChange,
}: {
  value: SearchFilterValue;
  onChange: (next: SearchFilterValue) => void;
}) {
  const toggleType = (type: ContentType) => {
    const has = value.contentTypes.includes(type);
    const contentTypes = has
      ? value.contentTypes.filter((t) => t !== type)
      : [...value.contentTypes, type];
    onChange({ ...value, contentTypes });
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Content type
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by content type">
          {CONTENT_TYPES.map((type) => {
            const meta = CONTENT_TYPE_META[type];
            const Icon = meta.icon;
            const active = value.contentTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(type)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {meta.labelPlural}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="max-w-[10rem]">
        <Label htmlFor="search-year">Year</Label>
        <Input
          id="search-year"
          type="number"
          inputMode="numeric"
          min={1900}
          max={3000}
          placeholder="Any year"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
        />
      </div>
    </div>
  );
}
