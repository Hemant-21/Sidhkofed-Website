'use client';

import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Labelled search field. Always paired with a visible or sr-only <label>. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  id = 'search-input',
  className,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  id?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      />
    </div>
  );
}
