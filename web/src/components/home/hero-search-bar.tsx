'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/language-provider';
import { SearchInput } from '@/components/ui/search-input';

/**
 * Hero-embedded search box. Deliberately NOT `<SearchForm>` — that component's
 * `useQueryParams` hook rewrites the *current* route's query string, which on the
 * homepage would produce `/?q=...` instead of navigating to `/search?q=...`.
 */
export function HeroSearchBar() {
  const router = useRouter();
  const { t } = useLanguage();
  const [term, setTerm] = useState('');

  const submit = () => {
    const q = term.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SearchInput
        id="hero-search"
        label={t('search.title')}
        value={term}
        onChange={setTerm}
        onSubmit={submit}
        placeholder={t('search.placeholder')}
        className="flex-1"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        {t('nav.search')}
      </button>
    </form>
  );
}
