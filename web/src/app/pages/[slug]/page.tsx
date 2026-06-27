import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { PageDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { stripTags } from '@/utils/sanitize-html';
import { DetailLayout } from '@/components/content/detail-layout';
import { CmsPageBody } from '@/components/details/cms-page';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 600;

const load = (slug: string) => getOneOrNull<PageDetail>(detailPath(PUBLIC_ENDPOINTS.pages, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await load(params.slug);
  if (!page) return { title: 'Page not found' };
  return buildMetadata({
    title: page.meta_title_en || page.title_en,
    description: page.meta_description_en || stripTags(page.body_en).slice(0, 200) || null,
    path: page.public_url,
  });
}

export default async function CmsPage({ params }: { params: { slug: string } }) {
  const page = await load(params.slug);
  if (!page) notFound();

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: page.title_en, url: page.public_url }]} />
      <DetailLayout crumbs={[{ label: page.title_en }]}>
        <CmsPageBody page={page} />
      </DetailLayout>
    </>
  );
}
