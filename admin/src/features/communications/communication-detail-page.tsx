'use client';

/**
 * Official Communication detail / view page. Read-only presentation of one communication plus
 * the lifecycle actions. Bilingual content in tabs. Expiry date is INFORMATIONAL — it never
 * automatically hides or unpublishes the record (codex §4.6 / §8).
 */

import { ExternalLink, FileText } from 'lucide-react';
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
import { COMMUNICATIONS_RESOURCE } from './api';
import type { CommunicationDetail } from './types';
import { CommunicationLifecycleActions } from './components/communication-lifecycle-actions';

export function CommunicationDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<CommunicationDetail>(COMMUNICATIONS_RESOURCE, id);
  const communication = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !communication) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Communication"
          breadcrumbs={[
            { label: 'Official Communications', href: ROUTES.communications },
            { label: 'Detail' },
          ]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={communication.title_en}
        description={communication.title_hi ?? undefined}
        breadcrumbs={[
          { label: 'Official Communications', href: ROUTES.communications },
          { label: communication.title_en },
        ]}
        actions={<CommunicationLifecycleActions communication={communication} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={communication.publication_state} />
        {communication.communication_type ? (
          <Badge tone="default">{communication.communication_type.name_en}</Badge>
        ) : null}
        {communication.highlight_type ? (
          <HighlightBadge highlight={communication.highlight_type} />
        ) : null}
        {communication.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!communication.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
        {communication.expiry_date ? (
          <Badge tone="muted" title="Informational — does not auto-unpublish">
            Expires {formatDate(communication.expiry_date)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Reference number">{communication.reference_number ?? '—'}</Item>
                <Item label="Issuing authority">{communication.issuing_authority ?? '—'}</Item>
                <Item label="Issue date">{formatDate(communication.issue_date)}</Item>
                <Item label="Effective date">{formatDate(communication.effective_date)}</Item>
                <Item label="Expiry date">
                  {communication.expiry_date
                    ? `${formatDate(communication.expiry_date)} (informational)`
                    : '—'}
                </Item>
                <Item label="Type">{communication.communication_type?.name_en ?? '—'}</Item>
              </dl>
            </CardContent>
          </Card>

          {communication.summary_en || communication.summary_hi ? (
            <Card>
              <CardHeader title="Summary" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={communication.summary_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={communication.summary_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          {communication.body_en || communication.body_hi ? (
            <Card>
              <CardHeader title="Body" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={communication.body_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={communication.body_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          {communication.document ? (
            <Card>
              <CardHeader title="Linked document" />
              <CardContent>
                <a
                  href={communication.document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {communication.document.title_en}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {communication.document.document_type} · {communication.document.language.toUpperCase()}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={communication.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {communication.public_url}{' '}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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

function Block({ body }: { body: string | null }) {
  if (!body) return <p className="text-sm text-muted-foreground">—</p>;
  return <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>;
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
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
