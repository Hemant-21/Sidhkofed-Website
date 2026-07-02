'use client';

/**
 * Shared, server-side searchable relationship picker (Phase 15.3 remediation — Finding 4).
 *
 * ONE picker reused by every content relation (programmes/institutions/galleries/documents/
 * events) for both single- and multi-select. It composes the existing primitives — `SearchInput`,
 * `Badge`, the feedback states — over {@link useRelationSearch}, so search, pagination, debounce,
 * and archived exclusion are all server-side. There is deliberately no per-module picker.
 *
 * Selected ids keep their labels via a small cache seeded from `initialOptions` (the labelled
 * refs the detail endpoint already returns) and augmented as results load — so chips render
 * correctly even before/without the matching result page being fetched.
 *
 * Accessibility: combobox button → listbox popover, `aria-selected` per option, `aria-multiselectable`
 * for multi mode, Escape to close, and a live "load more" control for additional pages.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks/use-click-outside';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/feedback/spinner';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import type { PublicationState } from '@/types/common';
import { useRelationSearch, relationLabel, type RelationOption } from './relation-search';

export interface RelationPickerProps {
  /** Admin resource to search (e.g. `programmes`, `institutions`, `galleries`, `documents`, `events`). */
  resource: string;
  /** Selected ids (always an array; single-select holds at most one). */
  value: string[];
  onChange: (value: string[]) => void;
  /** Single vs multi select. Defaults to multi. */
  multiple?: boolean;
  /** Labelled refs for already-selected ids (from the detail payload) so chips render immediately. */
  initialOptions?: RelationOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** Publication scope forwarded to the backend (defaults to published — archived excluded). */
  publicationState?: PublicationState | 'all';
  /** Optional id for the trigger (a11y labelling from a <Label htmlFor>). */
  id?: string;
}

export function RelationPicker({
  resource,
  value,
  onChange,
  multiple = true,
  initialOptions = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  invalid,
  className,
  publicationState,
  id,
}: RelationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const ref = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  useClickOutside(ref, () => setOpen(false), open);

  const search = useRelationSearch(resource, {
    search: debounced || undefined,
    enabled: open,
    publicationState,
  });

  // id → label cache. Seeded from initialOptions, then augmented as result pages arrive so a
  // previously selected option keeps its label even when it is not on the current search page.
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialOptions.map((o) => [o.value, o.label])),
  );
  useEffect(() => {
    if (initialOptions.length === 0) return;
    setLabels((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const o of initialOptions) {
        if (!next[o.value]) {
          next[o.value] = o.label;
          changed = true;
        }
      }
      return changed ? next : prev; // never return a fresh object when nothing changed (avoids render loops)
    });
  }, [initialOptions]);

  const results: RelationOption[] = useMemo(() => {
    const rows = search.data?.pages.flatMap((p) => p.items) ?? [];
    return rows.map((r) => ({ value: r.id, label: relationLabel(r) }));
  }, [search.data]);

  // Cache any labels we just learned from the server (effect — never mutate state in render).
  useEffect(() => {
    if (results.length === 0) return;
    setLabels((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const o of results) {
        if (next[o.value] !== o.label) {
          next[o.value] = o.label;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [results]);

  const labelFor = (val: string) => labels[val] ?? val;

  const toggle = (val: string, optionLabel: string) => {
    setLabels((prev) => (prev[val] ? prev : { ...prev, [val]: optionLabel }));
    if (multiple) {
      onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
    } else {
      onChange(value.includes(val) ? [] : [val]);
      setOpen(false);
    }
  };

  return (
    <div
      className={cn('relative', className)}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-danger' : 'border-input',
        )}
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((v) => (
              <Badge key={v} tone="info">
                {labelFor(v)}
              </Badge>
            ))
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg animate-content-show">
          <div className="p-2">
            <SearchInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} autoFocus />
          </div>

          {search.isError ? (
            <div className="p-3">
              <ErrorState error={search.error} onRetry={() => void search.refetch()} />
            </div>
          ) : search.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Spinner size="sm" /> Loading…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3">
              <EmptyState title="No matches" description="Try a different search term." />
            </div>
          ) : (
            <>
              <ul id={listboxId} role="listbox" aria-multiselectable={multiple || undefined} className="max-h-60 overflow-auto p-1">
                {results.map((opt) => {
                  const checked = value.includes(opt.value);
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={checked}
                        onClick={() => toggle(opt.value, opt.label)}
                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted focus:outline-none focus-visible:bg-muted"
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                          )}
                        >
                          {checked ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                        </span>
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {search.hasNextPage ? (
                <div className="border-t border-border p-1">
                  <button
                    type="button"
                    onClick={() => void search.fetchNextPage()}
                    disabled={search.isFetchingNextPage}
                    className="flex w-full items-center justify-center gap-2 rounded-sm px-2.5 py-2 text-sm text-primary hover:bg-muted disabled:opacity-50"
                  >
                    {search.isFetchingNextPage ? <Spinner size="sm" /> : null}
                    {search.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
