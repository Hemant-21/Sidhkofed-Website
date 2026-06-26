'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AccordionItemData {
  id: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

/**
 * Accessible accordion (WCAG). Each header is a real <button> with
 * `aria-expanded` + `aria-controls`; the panel is `role="region"` labelled by its
 * button. Keyboard operable by default (button semantics).
 */
export function Accordion({ items, defaultOpenId }: { items: AccordionItemData[]; defaultOpenId?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
        />
      ))}
    </div>
  );
}

function AccordionRow({
  item,
  open,
  onToggle,
}: {
  item: AccordionItemData;
  open: boolean;
  onToggle: () => void;
}) {
  const base = useId();
  const btnId = `${base}-btn`;
  const panelId = `${base}-panel`;
  return (
    <div>
      <h3 className="m-0">
        <button
          type="button"
          id={btnId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-base font-medium hover:bg-muted/50"
        >
          <span>{item.question}</span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={btnId} hidden={!open} className="px-4 pb-4 text-muted-foreground">
        {item.answer}
      </div>
    </div>
  );
}
