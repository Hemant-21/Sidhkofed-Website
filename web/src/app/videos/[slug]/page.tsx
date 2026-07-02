import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { Video } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { VideoDetailView } from '@/components/details/video-detail';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<Video>(detailPath(PUBLIC_ENDPOINTS.videos, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const video = await load(params.slug);
  if (!video) return { title: 'Video not found' };
  return buildMetadata({
    title: video.title_en,
    description: video.description_en,
    path: video.public_url,
    image: video.thumbnail_url,
  });
}

export default async function VideoDetailPage({ params }: { params: { slug: string } }) {
  const video = await load(params.slug);
  if (!video) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Publications', url: '/publications' },
          { name: 'Media Gallery', url: '/publications/media' },
          { name: video.title_en, url: video.public_url },
        ]}
      />
      <Breadcrumbs
        items={[
          { label: 'Publications', href: '/publications' },
          { label: 'Media Gallery', href: '/publications/media' },
          { label: video.title_en },
        ]}
      />
      <Container className="py-8">
        <VideoDetailView video={video} />
      </Container>
    </>
  );
}
