'use client';

/**
 * Digital Service detail / view page. Read-only presentation plus lifecycle actions. The external
 * URL is surfaced as a safe link (target=_blank, rel=noopener noreferrer) with a clear external
 * indicator — the CMS never embeds or proxies the external system (codex §4.14).
 */

import { ExternalLink, AppWindow } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { DIGITAL_SERVICES_RESOURCE } from './api';
import type { DigitalServiceDetail } from './types';
import { DigitalServiceLifecycleActions } from './components/digital-service-lifecycle-actions';

export function DigitalServiceDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<DigitalServiceDetail>(DIGITAL_SERVICES_RESOURCE, id);
  const service = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !service) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Digital service"
          breadcrumbs={[{ label: 'Digital Services', href: ROUTES.digitalServices }, { label: 'Detail' }]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={service.title_en}
        description={service.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Digital Services', href: ROUTES.digitalServices }, { label: service.title_en }]}
        actions={<DigitalServiceLifecycleActions service={service} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={service.publication_state} />
        {service.highlight_type ? <HighlightBadge highlight={service.highlight_type} /> : null}
        {service.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!service.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Service" />
            <CardContent>
              <div className="flex items-start gap-4">
                {service.icon?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.icon.url}
                    alt={service.icon.alt_text ?? ''}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-border text-muted-foreground">
                    <AppWindow className="h-7 w-7" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    External link
                  </p>
                  <a
                    href={service.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 break-all text-primary hover:underline"
                  >
                    {service.external_url}
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {service.description_en || service.description_hi ? (
            <Card>
              <CardHeader title="Description" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={service.description_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={service.description_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Identifier</p>
              <code className="break-all text-foreground">{service.slug}</code>
            </CardContent>
          </Card>
        </div>
      </div>
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
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
