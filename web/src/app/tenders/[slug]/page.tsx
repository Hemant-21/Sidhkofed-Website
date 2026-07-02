import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { TenderDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { TenderArticle, TenderAside } from '@/components/details/tender-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<TenderDetail>(detailPath(PUBLIC_ENDPOINTS.tenders, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tender = await load(params.slug);
  if (!tender) return { title: 'Tender not found' };
  return buildMetadata({ title: tender.title_en, description: tender.summary_en, path: tender.public_url });
}

export default async function TenderDetailPage({ params }: { params: { slug: string } }) {
  const tender = await load(params.slug);
  if (!tender) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Tenders', url: '/tenders' },
          { name: tender.title_en, url: tender.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Tenders', href: '/tenders' }, { label: tender.title_en }]}
        aside={<TenderAside tender={tender} />}
      >
        <TenderArticle tender={tender} />
      </DetailLayout>
    </>
  );
}
