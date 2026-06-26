'use client';

/**
 * Toolkit distribution summary page (`/toolkits/[id]/distributions`). It loads the toolkit (to
 * resolve the slug + publication state) and renders the read-only, backend-calculated aggregate
 * (DistributionSummaryPanel). Per-event distribution figures are AUTHORED in the Events module —
 * this page only displays the toolkit-level rollup; totals are never computed in the frontend.
 */

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { Alert } from '@/components/ui/alert';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { TOOLKITS_RESOURCE } from './api';
import type { ToolkitDetail } from './types';
import { DistributionSummaryPanel } from './components/distribution-summary-panel';

export function ToolkitDistributionsPage({ id }: { id: string }) {
  const detail = useCrudDetail<ToolkitDetail>(TOOLKITS_RESOURCE, id);
  const toolkit = detail.data;

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (detail.isError || !toolkit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Distribution summary" breadcrumbs={[{ label: 'Toolkits', href: ROUTES.toolkits }, { label: 'Distributions' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Distribution summary: ${toolkit.title_en}`}
        description="Read-only rollup of published per-event distribution figures, calculated by the backend."
        breadcrumbs={[
          { label: 'Toolkits', href: ROUTES.toolkits },
          { label: toolkit.title_en, href: `${ROUTES.toolkits}/${toolkit.id}` },
          { label: 'Distributions' },
        ]}
      />

      <Alert tone="info" title="Where distributions are recorded">
        Per-event toolkit distributions are entered from the Events module (on a training event). This page aggregates those
        figures for the toolkit and is read-only.
      </Alert>

      <DistributionSummaryPanel slug={toolkit.slug} isPublished={toolkit.publication_state === 'published'} />

      <p className="text-sm text-muted-foreground">
        <Link href={`${ROUTES.toolkits}/${toolkit.id}`} className="text-primary hover:underline">
          ← Back to toolkit
        </Link>
      </p>
    </div>
  );
}
