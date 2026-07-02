'use client';

/**
 * Programme detail / view page. Read-only presentation of one programme plus the lifecycle actions.
 * Bilingual content shows in tabs. Linked masters (commodities, permitted training types) use the
 * compact references the backend returns. Loading/error states are the shared components.
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate } from '@/utils/date';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PROGRAMMES_RESOURCE } from './api';
import type { ProgrammeDetail } from './types';
import { ProgrammeLifecycleActions } from './components/programme-lifecycle-actions';

export function ProgrammeDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<ProgrammeDetail>(PROGRAMMES_RESOURCE, id);
  const programme = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !programme) {
    return (
      <div className="space-y-6">
        <PageHeader title="Programme" breadcrumbs={[{ label: 'Programmes', href: ROUTES.programmes }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={programme.title_en}
        description={programme.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Programmes', href: ROUTES.programmes }, { label: programme.title_en }]}
        actions={<ProgrammeLifecycleActions programme={programme} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={programme.publication_state} />
        {programme.short_code ? <Badge tone="default">{programme.short_code}</Badge> : null}
        {programme.highlight_type ? <HighlightBadge highlight={programme.highlight_type} /> : null}
        {programme.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!programme.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Funding source">{programme.funding_source ?? '—'}</Item>
                <Item label="Short code">{programme.short_code ?? '—'}</Item>
                <Item label="Start date">{formatDate(programme.start_date)}</Item>
                <Item label="End date">{formatDate(programme.end_date)}</Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Content" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <Block label="Summary" body={programme.summary_en} />
                  <Block label="Description" body={programme.description_en} />
                  <Block label="Objectives" body={programme.objectives_en} />
                  <Block label="Eligibility" body={programme.eligibility_en} />
                  <Block label="Benefits" body={programme.benefits_en} />
                  <Block label="Application process" body={programme.application_process_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <Block label="सारांश" body={programme.summary_hi} />
                  <Block label="विवरण" body={programme.description_hi} />
                  <Block label="उद्देश्य" body={programme.objectives_hi} />
                  <Block label="पात्रता" body={programme.eligibility_hi} />
                  <Block label="लाभ" body={programme.benefits_hi} />
                  <Block label="आवेदन प्रक्रिया" body={programme.application_process_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Relationships" />
            <CardContent className="space-y-4">
              <RefList label="Commodities" items={programme.commodities.map((c) => c.name_en)} />
              <RefList label="Permitted training types" items={programme.permitted_training_types.map((t) => t.name_en)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {programme.cover_media?.url ? (
            <Card>
              <CardHeader title="Cover image" />
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={programme.cover_media.url}
                  alt={programme.cover_media.alt_text ?? programme.title_en}
                  className="w-full rounded-md object-cover"
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={programme.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {programme.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="mb-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
    </div>
  );
}

function RefList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <Badge key={i} tone="default">
              {i}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
