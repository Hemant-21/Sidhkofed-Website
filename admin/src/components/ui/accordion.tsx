'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

/** Accessible accordion (button headers, aria-expanded/controls, region panels). */
export function Accordion({
  items,
  defaultOpenIds = [],
  allowMultiple = false,
  className,
}: {
  items: AccordionItem[];
  defaultOpenIds?: string[];
  allowMultiple?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<string[]>(defaultOpenIds);
  const baseId = useId();

  const toggle = (id: string) =>
    setOpen((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : allowMultiple
          ? [...prev, id]
          : [id],
    );

  return (
    <div className={cn('divide-y divide-border rounded-md border border-border', className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${item.id}`}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.title}
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
            </h3>
            {isOpen ? (
              <div id={`${baseId}-${item.id}`} role="region" className="px-4 pb-4 text-sm text-muted-foreground">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
