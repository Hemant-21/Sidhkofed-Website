'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/providers/language-provider';

/**
 * Accessible pagination control. Renders a real <nav> with labelled buttons.
 * Page changes are reported via `onPageChange`; the parent owns URL sync.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-10 items-center gap-1 rounded-md border border-input bg-surface px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{t('common.previous')}</span>
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`${t('common.page')} ${p}`}
            className={cn(
              'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-md border px-3 text-sm font-medium',
              p === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-surface hover:bg-muted',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-10 items-center gap-1 rounded-md border border-input bg-surface px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="sr-only sm:not-sr-only">{t('common.next')}</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

/** Compute a compact page window with ellipses, e.g. 1 … 4 5 6 … 20. */
function pageWindow(current: number, total: number): Array<number | '…'> {
  const delta = 1;
  const range: Array<number | '…'> = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push('…');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('…');
  if (total > 1) range.push(total);
  return range;
}
