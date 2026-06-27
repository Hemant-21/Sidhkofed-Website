import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { CommunicationDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { CommunicationArticle, CommunicationAside } from '@/components/details/communication-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) =>
  getOneOrNull<CommunicationDetail>(detailPath(PUBLIC_ENDPOINTS.communications, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await load(params.slug);
  if (!item) return { title: 'Notice not found' };
  return buildMetadata({
    title: item.title_en,
    description: item.summary_en ?? null,
    path: `/notifications/notices/${params.slug}`,
  });
}

export default async function NoticeDetailPage({ params }: { params: { slug: string } }) {
  const item = await load(params.slug);
  if (!item) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Notifications', url: '/notifications' },
          { name: 'Notices', url: '/notifications/notices' },
          { name: item.title_en, url: item.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[
          { label: 'Notifications', href: '/notifications' },
          { label: 'Notices', href: '/notifications/notices' },
          { label: item.title_en },
        ]}
        aside={<CommunicationAside item={item} />}
      >
        <CommunicationArticle item={item} />
      </DetailLayout>
    </>
  );
}
