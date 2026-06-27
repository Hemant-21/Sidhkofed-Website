import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { ProcurementDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { ProcurementArticle, ProcurementAside } from '@/components/details/procurement-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<ProcurementDetail>(detailPath(PUBLIC_ENDPOINTS.procurement, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await load(params.slug);
  if (!item) return { title: 'Procurement update not found' };
  return buildMetadata({ title: item.title_en, description: item.summary_en, path: item.public_url });
}

export default async function ProcurementDetailPage({ params }: { params: { slug: string } }) {
  const item = await load(params.slug);
  if (!item) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Procurement updates', url: '/procurement-updates' },
          { name: item.title_en, url: item.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Procurement updates', href: '/procurement-updates' }, { label: item.title_en }]}
        aside={<ProcurementAside item={item} />}
      >
        <ProcurementArticle item={item} />
      </DetailLayout>
    </>
  );
}
