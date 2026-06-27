import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOneOrNull } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS, detailPath } from '@/lib/api/endpoints';
import type { NewsDetail } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { DetailLayout } from '@/components/content/detail-layout';
import { NewsArticle } from '@/components/details/news-detail';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const revalidate = 300;

const load = (slug: string) => getOneOrNull<NewsDetail>(detailPath(PUBLIC_ENDPOINTS.news, slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const news = await load(params.slug);
  if (!news) return { title: 'News not found' };
  return buildMetadata({
    title: news.title_en,
    description: news.summary_en,
    path: news.public_url,
    image: news.cover_media?.url ?? null,
    type: 'article',
  });
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const news = await load(params.slug);
  if (!news) notFound();

  return (
    <>
      <ArticleJsonLd
        headline={news.title_en}
        datePublished={news.news_published_at}
        image={news.cover_media?.url ?? null}
        url={news.public_url}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'News', url: '/news' },
          { name: news.title_en, url: news.public_url },
        ]}
      />
      <DetailLayout crumbs={[{ label: 'News', href: '/news' }, { label: news.title_en }]}>
        <NewsArticle news={news} />
      </DetailLayout>
    </>
  );
}
