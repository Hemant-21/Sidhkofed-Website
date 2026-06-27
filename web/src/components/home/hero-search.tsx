'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, AppWindow } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { SearchInput } from '@/components/ui/search-input';
import { buttonClasses } from '@/components/ui/button';

/** Homepage hero with the primary search entry point and key CTAs. */
export function HeroSearch() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [q, setQ] = useState('');

  const submit = () => {
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl" lang={language}>
        {t('site.name')}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/90 sm:text-lg" lang={language}>
        {t('site.tagline')}
      </p>

      <form
        className="mx-auto mt-8 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        role="search"
      >
        <SearchInput
          value={q}
          onChange={setQ}
          onSubmit={submit}
          label={t('search.title')}
          placeholder={t('search.placeholder')}
          id="hero-search"
          className="flex-1"
        />
        <button type="submit" className={buttonClasses('accent', 'lg')}>
          {t('nav.search')}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/impact/dashboard" className={buttonClasses('secondary', 'md')}>
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          {t('home.hero.cta.dashboard')}
        </Link>
        <Link href="/digital-services" className={buttonClasses('outline', 'md')}>
          <AppWindow className="h-4 w-4" aria-hidden="true" />
          {t('home.hero.cta.services')}
        </Link>
      </div>
    </div>
  );
}
