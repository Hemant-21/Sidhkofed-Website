import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { InstitutionDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { InstitutionArticle, InstitutionAside } from '@/components/details/institution-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<InstitutionDetail>(detailPath(PUBLIC_ENDPOINTS.institutions, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const institution = await load(params.slug);
  if (!institution) return { title: 'Institution not found' };
  return buildMetadata({
    title: institution.name_en,
    description: institution.description_en,
    path: institution.public_url,
    image: institution.logo?.url ?? null,
  });
}

export default async function InstitutionDetailPage({ params }: { params: { slug: string } }) {
  const institution = await load(params.slug);
  if (!institution) notFound();

  const hasContact = Boolean(
    institution.address_en ||
      institution.address_hi ||
      institution.contact_email ||
      institution.contact_phone ||
      institution.website_url,
  );

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Institutions', url: '/institutions' },
          { name: institution.name_en, url: institution.public_url },
        ]}
      />
      <DetailLayout
        crumbs={[{ label: 'Institutions', href: '/institutions' }, { label: institution.name_en }]}
        aside={hasContact ? <InstitutionAside institution={institution} /> : undefined}
      >
        <InstitutionArticle institution={institution} />
      </DetailLayout>
    </>
  );
}
