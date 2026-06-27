import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { ProgrammeDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { ProgrammeArticle, ProgrammeAside } from '@/components/details/programme-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<ProgrammeDetail>(detailPath(PUBLIC_ENDPOINTS.programmes, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const programme = await load(params.slug);
  if (!programme) return { title: 'Programme not found' };
  return buildMetadata({
    title: programme.title_en,
    description: programme.summary_en,
    path: programme.public_url,
    image: programme.cover_media?.url ?? null,
    type: 'article',
  });
}

export default async function ProgrammeDetailPage({ params }: { params: { slug: string } }) {
  const programme = await load(params.slug);
  if (!programme) notFound();

  const hasAside = programme.commodities.length > 0 || programme.permitted_training_types.length > 0;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Programmes', url: '/programmes' },
          { name: programme.title_en, url: programme.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Programmes', href: '/programmes' }, { label: programme.title_en }]}
        aside={hasAside ? <ProgrammeAside programme={programme} /> : undefined}
      >
        <ProgrammeArticle programme={programme} />
      </DetailLayout>
    </>
  );
}
