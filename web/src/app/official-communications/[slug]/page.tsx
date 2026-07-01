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
  if (!item) return { title: 'Communication not found' };
  return buildMetadata({ title: item.title_en, description: item.summary_en, path: item.public_url });
}

export default async function CommunicationDetailPage({ params }: { params: { slug: string } }) {
  const item = await load(params.slug);
  if (!item) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Official communications', url: '/official-communications' },
          { name: item.title_en, url: item.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Official communications', href: '/official-communications' }, { label: item.title_en }]}
        aside={<CommunicationAside item={item} />}
      >
        <CommunicationArticle item={item} />
      </DetailLayout>
    </>
  );
}
