'use client';

/**
 * Document detail / view page. Read-only presentation of one document plus the lifecycle/version
 * actions. Bilingual content shows in tabs. The linked file is previewed safely (opens in a new
 * tab) with a separate download affordance (codex §4.5). Linked records use the compact references
 * the backend returns. Loading/error states are the shared components.
 */

import { Download, ExternalLink, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatDate } from '@/utils/date';
import { formatFileSize } from '@/utils/format';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { DOCUMENTS_RESOURCE } from './api';
import type { DocumentDetail } from './types';
import { DocumentLifecycleActions } from './components/document-lifecycle-actions';

export function DocumentDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<DocumentDetail>(DOCUMENTS_RESOURCE, id);
  const document = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !document) {
    return (
      <div className="space-y-6">
        <PageHeader title="Document" breadcrumbs={[{ label: 'Documents', href: ROUTES.documents }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={document.title_en}
        description={document.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Documents', href: ROUTES.documents }, { label: document.title_en }]}
        actions={<DocumentLifecycleActions document={document} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={document.publication_state} />
        <Badge tone="default">{document.document_type.name_en}</Badge>
        <Badge tone="default">{document.language.toUpperCase()}</Badge>
        {document.show_in_knowledge_centre && document.knowledge_category ? (
          <Badge tone="info">Knowledge Centre · {document.knowledge_category.name_en}</Badge>
        ) : null}
        {document.highlight_type ? <HighlightBadge highlight={document.highlight_type} /> : null}
        {document.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!document.is_public ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Document type">{document.document_type.name_en}</Item>
                <Item label="Publication date">{formatDate(document.publication_date)}</Item>
                <Item label="Financial year">{document.financial_year?.label ?? '—'}</Item>
                <Item label="Language">{document.language.toUpperCase()}</Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <ContentBlock body={document.description_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <ContentBlock body={document.description_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Relationships" />
            <CardContent className="space-y-4">
              <RefList label="Commodities" items={document.commodities.map((c) => c.name_en)} />
              <RefList label="Districts" items={document.districts.map((x) => x.name_en)} />
              <RefList label="Tags" items={document.tags.map((t) => t.name_en)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Current file" description="Version management is backend-driven — replacing the file keeps this document's URL." />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={document.file.file_name}>
                    {document.file.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {document.file.mime_type} · {formatFileSize(document.file.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={document.file.file_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href={document.file.file_url} download={document.file.file_name}>
                    <Download className="h-4 w-4" aria-hidden="true" /> Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={document.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {document.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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

function ContentBlock({ body }: { body: string | null }) {
  return body ? (
    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
  ) : (
    <p className="text-sm text-muted-foreground">No description provided.</p>
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
