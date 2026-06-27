import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { EventDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { EventArticle, EventAside } from '@/components/details/event-detail';
import { BreadcrumbJsonLd, EventJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<EventDetail>(detailPath(PUBLIC_ENDPOINTS.events, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await load(params.slug);
  if (!event) return { title: 'Event not found' };
  return buildMetadata({
    title: event.title_en,
    description: event.summary_en,
    path: event.public_url,
    image: event.cover_media?.url ?? null,
    type: 'article',
  });
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await load(params.slug);
  if (!event) notFound();

  return (
    <>
      <EventJsonLd
        name={event.title_en}
        startDate={event.start_date}
        endDate={event.end_date}
        location={event.location_text}
        url={event.public_url}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Events', url: '/events' },
          { name: event.title_en, url: event.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Events', href: '/events' }, { label: event.title_en }]}
        aside={<EventAside event={event} />}
      >
        <EventArticle event={event} />
      </DetailLayout>
    </>
  );
}
