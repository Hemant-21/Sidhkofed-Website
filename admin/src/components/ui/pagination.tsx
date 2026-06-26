'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { pageRange, paginationRange } from '@/utils/pagination';
import { formatNumber } from '@/utils/format';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Server-pagination control with a compact page sequence + range summary. */
export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return (
      <div className={cn('flex items-center justify-between text-sm text-muted-foreground', className)}>
        <span>{formatNumber(totalItems)} items</span>
      </div>
    );
  }

  const [from, to] = pageRange(page, pageSize, totalItems);
  const items = paginationRange(page, totalPages);

  return (
    <nav
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{formatNumber(from)}</span>–
        <span className="font-medium text-foreground">{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-foreground">{formatNumber(totalItems)}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          ariaLabel="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        {items.map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <PageButton
              key={item}
              ariaLabel={`Page ${item}`}
              active={item === page}
              onClick={() => onPageChange(item)}
            >
              {item}
            </PageButton>
          ),
        )}
        <PageButton
          ariaLabel="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
