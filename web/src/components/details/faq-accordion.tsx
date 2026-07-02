'use client';

/** FAQ accordion (bilingual, WCAG accordion). Questions/answers come from the API;
 *  answers may contain sanitized rich text. */

import type { Faq } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Accordion, type AccordionItemData } from '@/components/ui/accordion';
import { RichText } from '@/components/content/rich-text';

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const { language } = useLanguage();

  const items: AccordionItemData[] = faqs.map((faq) => ({
    id: faq.id,
    question: pickText(faq.question_en, faq.question_hi, language),
    answer: <RichText html={language === 'hi' ? faq.answer_hi || faq.answer_en : faq.answer_en} lang={language} />,
  }));

  return <Accordion items={items} defaultOpenId={items[0]?.id} />;
}
