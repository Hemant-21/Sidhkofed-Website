import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { GalleryDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { GalleryDetailView } from '@/components/details/gallery-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<GalleryDetail>(detailPath(PUBLIC_ENDPOINTS.galleries, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const gallery = await load(params.slug);
  if (!gallery) return { title: 'Gallery not found' };
  return buildMetadata({
    title: gallery.title_en,
    description: gallery.description_en,
    path: gallery.public_url,
    image: gallery.cover_media?.url ?? null,
  });
}

export default async function GalleryDetailPage({ params }: { params: { slug: string } }) {
  const gallery = await load(params.slug);
  if (!gallery) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Publications', url: '/publications' },
          { name: 'Media Gallery', url: '/publications/media' },
          { name: gallery.title_en, url: gallery.public_url },
        ]}
      />
      <Breadcrumbs
        items={[
          { label: 'Publications', href: '/publications' },
          { label: 'Media Gallery', href: '/publications/media' },
          { label: gallery.title_en },
        ]}
      />
      <Container className="py-8">
        <GalleryDetailView gallery={gallery} />
      </Container>
    </>
  );
}
