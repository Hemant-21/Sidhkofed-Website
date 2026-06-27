import type { Metadata } from 'next';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { Faq } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { ListingLayout } from '@/components/listing/listing-layout';
import { EmptyState } from '@/components/feedback/states';
import { FaqAccordion } from '@/components/details/faq-accordion';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Membership FAQs',
  description: 'Frequently asked questions about SIDHKOFED membership.',
  path: '/membership/faqs',
});

export default async function MembershipFaqsPage() {
  const list = await getListSafe<Faq>(PUBLIC_ENDPOINTS.faqs, {
    query: { faq_category_slug: 'membership', page_size: 50, ordering: 'display_order' },
  });

  return (
    <ListingLayout
      titleKey="page.membership.faqs.title"
      subtitleKey="page.membership.faqs.subtitle"
      crumb="Membership FAQs"
      parentCrumbs={[{ label: 'Membership', href: '/membership' }]}
    >
      {list.items.length === 0 ? (
        <EmptyState />
      ) : (
        <FaqAccordion faqs={list.items} />
      )}
    </ListingLayout>
  );
}
