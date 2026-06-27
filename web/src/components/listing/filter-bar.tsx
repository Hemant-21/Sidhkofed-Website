'use client';

/**
 * Backend-driven filter bar for listing pages. Filter option data (masters,
 * programmes, years) is fetched server-side and passed in; this island only syncs
 * the active selection to the URL query string (shareable, back-button friendly).
 * Search is debounced; selects apply immediately. Unknown filter keys are ignored
 * by the API, so this never breaks a listing.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryParams } from '@/hooks/use-query-params';
import { useDebounce } from '@/hooks/use-debounce';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  value: string;
  name_en: string;
  name_hi?: string | null;
}

export interface FilterSelect {
  /** Query-string key, e.g. `event_type`. */
  key: string;
  /** i18n key for the field label, e.g. `filter.type`. */
  labelKey: string;
  options: FilterOption[];
}

export function FilterBar({
  selects = [],
  searchable = true,
  searchPlaceholderKey = 'search.placeholder',
}: {
  selects?: FilterSelect[];
  searchable?: boolean;
  searchPlaceholderKey?: string;
}) {
  const { get, setParams, clearParams, searchParams } = useQueryParams();
  const { t, language } = useLanguage();

  const [term, setTerm] = useState(() => get('search'));
  const debounced = useDebounce(term, 350);
  const mounted = useRef(false);

  // Push the debounced search term to the URL (skips the initial mount so a fresh
  // load with a pre-set ?search= isn't clobbered).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setParams({ search: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasActive = Array.from(searchParams.keys()).some((k) => k !== 'page');

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        {searchable && (
          <div className="min-w-0 flex-1 md:min-w-[16rem]">
            <SearchInput
              id="listing-search"
              label={t('nav.search')}
              value={term}
              onChange={setTerm}
              placeholder={t(searchPlaceholderKey)}
            />
          </div>
        )}

        {selects.map((s) => (
          <Select
            key={s.key}
            id={`filter-${s.key}`}
            label={t(s.labelKey)}
            value={get(s.key)}
            onChange={(v) => setParams({ [s.key]: v || null })}
            placeholder={t('common.all')}
            options={s.options.map((o) => ({
              value: o.value,
              label: pickText(o.name_en, o.name_hi ?? null, language),
            }))}
            className="md:w-44"
          />
        ))}

        {hasActive && (
          <Button
            variant="outline"
            onClick={() => {
              setTerm('');
              clearParams();
            }}
          >
            {t('common.clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
