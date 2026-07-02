'use client';

/** Search controls for the dedicated search page: a query field (min 2 chars) and a
 *  content-type filter, both synced to the URL (?q=&content_type=). Results are
 *  rendered server-side from the backend search API. */

import { useState } from 'react';
import { useQueryParams } from '@/hooks/use-query-params';
import { useLanguage } from '@/providers/language-provider';
import { SEARCH_CONTENT_TYPES } from '@/lib/types/content';
import { humanizeEnum } from '@/utils/format';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function SearchForm() {
  const { get, setParams } = useQueryParams();
  const { t } = useLanguage();
  const [term, setTerm] = useState(() => get('q'));

  const submit = () => setParams({ q: term.trim() || null });

  return (
    <form
      role="search"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex-1">
        <SearchInput
          id="site-search"
          label={t('search.title')}
          value={term}
          onChange={setTerm}
          onSubmit={submit}
          placeholder={t('search.placeholder')}
        />
      </div>
      <Select
        id="search-content-type"
        label={t('search.filterType')}
        value={get('content_type')}
        onChange={(v) => setParams({ content_type: v || null })}
        placeholder={t('common.all')}
        options={SEARCH_CONTENT_TYPES.map((c) => ({ value: c, label: humanizeEnum(c) }))}
        className="sm:w-52"
      />
      <Button type="submit" className="sm:h-10">
        {t('nav.search')}
      </Button>
    </form>
  );
}
