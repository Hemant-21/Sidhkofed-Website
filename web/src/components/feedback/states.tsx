'use client';

import Link from 'next/link';
import { Inbox, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/providers/language-provider';

/** Empty state for listings with no published content. */
export function EmptyState({ title, body }: { title?: string; body?: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <Inbox className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-semibold text-foreground">{title ?? t('state.empty.title')}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body ?? t('state.empty.body')}</p>
    </div>
  );
}

/** Error state with optional retry. */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/5 px-6 py-16 text-center"
    >
      <AlertCircle className="mb-3 h-10 w-10 text-danger" aria-hidden="true" />
      <p className="text-lg font-semibold text-foreground">{t('state.error.title')}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message ?? t('state.error.body')}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('state.error.retry')}
        </Button>
      )}
    </div>
  );
}

/** Centered "go home" block used by 404. */
export function NotFoundBlock() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{t('state.notFound.title')}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t('state.notFound.body')}</p>
      <Link href="/" className="mt-6">
        <Button>{t('state.notFound.cta')}</Button>
      </Link>
    </div>
  );
}
