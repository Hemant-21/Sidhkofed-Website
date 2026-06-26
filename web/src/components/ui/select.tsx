'use client';

import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

/** Accessible native select with an associated visible label. */
export function Select({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  id: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
