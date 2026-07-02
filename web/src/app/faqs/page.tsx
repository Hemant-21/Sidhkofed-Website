import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { Faq } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { qstr, getMasterOptions } from '@/lib/listing';
import { ListingLayout } from '@/components/listing/listing-layout';
import { FilterBar } from '@/components/listing/filter-bar';
import { EmptyState } from '@/components/feedback/states';
import { FaqAccordion } from '@/components/details/faq-accordion';
import { FaqJsonLd } from '@/components/seo/json-ld';
import { stripTags } from '@/utils/sanitize-html';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Frequently asked questions',
  description: 'Answers to common questions about SIDHKOFED services and content.',
  path: '/faqs',
});

type SP = Record<string, string | string[] | undefined>;

export default async function FaqsPage({ searchParams }: { searchParams: SP }) {
  const [list, categories] = await Promise.all([
    getListSafe<Faq>(PUBLIC_ENDPOINTS.faqs, {
      query: {
        page_size: 100,
        faq_category: qstr(searchParams.faq_category),
        search: qstr(searchParams.search),
      },
    }),
    getMasterOptions('faq-categories'),
  ]);

  return (
    <ListingLayout
      titleKey="page.faqs.title"
      subtitleKey="page.faqs.subtitle"
      crumb="FAQs"
      filters={
        <FilterBar
          selects={[{ key: 'faq_category', labelKey: 'filter.category', options: categories }]}
        />
      }
    >
      <FaqJsonLd
        items={list.items.map((f) => ({ question: f.question_en, answer: stripTags(f.answer_en) }))}
      />
      {list.items.length === 0 ? <EmptyState /> : <FaqAccordion faqs={list.items} />}
    </ListingLayout>
  );
}
