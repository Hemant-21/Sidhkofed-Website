'use client';

/**
 * Accessible multi-select (checkbox list in a popover). For relation arrays the
 * backend accepts as comma-separated IDs (events.commodity_ids, etc.). Searchable;
 * shows selected count. Single-select searchable cases use Autocomplete instead.
 */

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks/use-click-outside';
import { Badge } from './badge';
import { SearchInput } from './search-input';
import type { SelectOption } from './select';

export interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  invalid,
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const selectedLabels = options.filter((o) => value.includes(o.value));

  const toggle = (val: string) =>
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
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
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((o) => (
              <Badge key={o.value} tone="info">
                {o.label}
              </Badge>
            ))
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg animate-content-show">
          <div className="p-2">
            <SearchInput value={query} onValueChange={setQuery} placeholder="Filter options…" />
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      disabled={opt.disabled}
                      onClick={() => toggle(opt.value)}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted focus:outline-none focus-visible:bg-muted disabled:opacity-50"
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
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
