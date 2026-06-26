'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from './input';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
}

/**
 * Search field with a leading icon + clear button. Debouncing is the caller's
 * concern (see useDebounce/useSearch) so this stays a pure controlled input.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, value, onValueChange, onClear, placeholder = 'Search…', ...props },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onValueChange('');
            onClear?.();
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});
