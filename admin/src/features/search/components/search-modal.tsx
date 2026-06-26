'use client';

/**
 * Global search modal (Phase 15.2) — the Ctrl/Cmd+K command palette. A purpose-
 * built modal (the generic confirm-Dialog's fixed header doesn't suit a palette)
 * that REUSES the shared `useFocusTrap` hook for WCAG-compliant focus management,
 * plus ESC-to-close, scroll-lock, overlay dismiss, restored focus, and an
 * `aria-modal` dialog role. Debounced, server-side, minimum-length-gated search
 * with grouped results and full loading / empty / error / no-results states.
 * Selecting a result navigates to the admin record and closes the modal.
 */

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRight, SearchX } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { Spinner } from '@/components/feedback/spinner';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useSearch } from '@/hooks/use-search';
import { ROUTES } from '@/constants/routes';
import { MIN_QUERY_LENGTH } from '@/types/search';
import { useSearchResults, isSearchable } from '../hooks';
import { SearchResults } from './search-results';

function ModalBody({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const { query, setQuery, debouncedQuery } = useSearch('');
  const trimmed = debouncedQuery.trim();
  const { data, isLoading, isFetching, error, refetch } = useSearchResults({ q: trimmed, page_size: 20 });

  const ready = isSearchable(trimmed);
  const results = data?.items ?? [];

  return (
    <>
      <div className="border-b border-border p-3">
        <h2 id={titleId} className="sr-only">
          Global search
        </h2>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- expected for a command palette */}
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search events, documents, tenders…"
          autoFocus
          aria-label="Search all content"
        />
      </div>

      <div className="max-h-[60vh] min-h-[8rem] overflow-y-auto p-3" aria-live="polite" aria-busy={isFetching}>
        {!ready ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Type at least {MIN_QUERY_LENGTH} characters to search across all content.
          </p>
        ) : isLoading ? (
          <div className="px-3">
            <SkeletonText lines={5} />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : results.length === 0 ? (
          <EmptyState icon={SearchX} title="No results" description={`Nothing matched “${trimmed}”.`} />
        ) : (
          <SearchResults results={results} onNavigate={onClose} />
        )}
      </div>

      {ready ? (
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            {isFetching ? <Spinner size="sm" /> : null}
            {data ? `${data.pagination.total_items} result${data.pagination.total_items === 1 ? '' : 's'}` : ''}
          </span>
          <Link
            href={`${ROUTES.search}?q=${encodeURIComponent(trimmed)}`}
            onClick={onClose}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all results
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </>
  );
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/50 animate-overlay-show" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-xl animate-content-show"
      >
        {/* Children mount only while open, so each open is a fresh search session. */}
        <ModalBody titleId={titleId} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
