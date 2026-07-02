'use client';

/**
 * News edit page. Loads the news detail (shared useCrudDetail), gates on `content.update`, and
 * renders the edit form. News cannot be created here (no create endpoint) — only edited.
 */

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { NEWS_RESOURCE, CONTENT_PERMS } from './api';
import type { NewsDetail } from './types';
import { NewsForm } from './components/news-form';

export function NewsEditPage({ id }: { id: string }) {
  const detail = useCrudDetail<NewsDetail>(NEWS_RESOURCE, id);

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit news" />
        <Card>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit news" breadcrumbs={[{ label: 'News', href: ROUTES.news }, { label: 'Edit' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const news = detail.data;

  return (
    <Can
      permission={CONTENT_PERMS.update}
      fallback={
        <div className="space-y-6">
          <PageHeader title="Edit news" />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={`Edit: ${news.title_en}`}
          breadcrumbs={[{ label: 'News', href: ROUTES.news }, { label: news.title_en, href: `${ROUTES.news}/${news.id}` }, { label: 'Edit' }]}
        />
        <Card>
          <CardContent>
            <NewsForm news={news} />
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          <Link href={`${ROUTES.news}/${news.id}`} className="text-primary hover:underline">
            ← Back to news
          </Link>
        </p>
      </div>
    </Can>
  );
}
