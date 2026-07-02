'use client';

import type { Faq } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';

interface FaqAccordionProps {
  faqs: Faq[];
  title?: string;
}

export function FaqAccordion({ faqs, title = 'Frequently Asked Questions' }: FaqAccordionProps) {
  const { language } = useLanguage();

  if (faqs.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-6 text-xl font-semibold text-foreground">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {faqs.map((faq) => (
          <details key={faq.id} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-foreground marker:hidden hover:bg-muted/50 group-open:text-primary">
              <span>{pickText(faq.question_en, faq.question_hi, language)}</span>
              {/* chevron */}
              <svg
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>
            <div className="border-t border-border bg-muted/30 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              {pickText(faq.answer_en, faq.answer_hi, language)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
