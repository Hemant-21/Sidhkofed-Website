'use client';

/**
 * Procurement Update detail / view page. Displays backend data only — no rate calculations,
 * no procurement logic, no ERP integration (codex §4.8 / non-goals). Rate and unit are
 * presented as-is from the backend.
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
import { PROCUREMENT_RESOURCE } from './api';
import type { ProcurementDetail } from './types';
import { ProcurementLifecycleActions } from './components/procurement-lifecycle-actions';

const STATUS_TONE: Record<string, 'success' | 'muted' | 'warning' | 'default'> = {
  active: 'success',
  closed: 'muted',
  upcoming: 'warning',
};

export function ProcurementDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<ProcurementDetail>(PROCUREMENT_RESOURCE, id);
  const procurement = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !procurement) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Procurement Update"
          breadcrumbs={[
            { label: 'Procurement Updates', href: ROUTES.procurement },
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
        title={procurement.title_en}
        description={procurement.title_hi ?? undefined}
        breadcrumbs={[
          { label: 'Procurement Updates', href: ROUTES.procurement },
          { label: procurement.title_en },
        ]}
        actions={<ProcurementLifecycleActions procurement={procurement} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={procurement.publication_state} />
        {procurement.procurement_update_type ? (
          <Badge tone="default">{procurement.procurement_update_type.name_en}</Badge>
        ) : null}
        {procurement.status ? (
          <Badge tone={STATUS_TONE[procurement.status] ?? 'default'}>
            {procurement.status.charAt(0).toUpperCase() + procurement.status.slice(1)}
          </Badge>
        ) : null}
        {procurement.commodity ? (
          <Badge tone="default">{procurement.commodity.name_en}</Badge>
        ) : null}
        {procurement.highlight_type ? (
          <HighlightBadge highlight={procurement.highlight_type} />
        ) : null}
        {procurement.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
        {!procurement.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Update type">
                  {procurement.procurement_update_type?.name_en ?? '—'}
                </Item>
                <Item label="Commodity">{procurement.commodity?.name_en ?? '—'}</Item>
                <Item label="Programme">{procurement.programme?.title_en ?? '—'}</Item>
                <Item label="District">{procurement.district?.name_en ?? '—'}</Item>
                <Item label="Block">{procurement.block?.name_en ?? '—'}</Item>
                <Item label="Location">{procurement.location_text ?? '—'}</Item>
                <Item label="Effective date">{formatDate(procurement.effective_date)}</Item>
                <Item label="Period">
                  {procurement.period_start || procurement.period_end
                    ? `${formatDate(procurement.period_start)} – ${formatDate(procurement.period_end)}`
                    : '—'}
                </Item>
                {procurement.rate != null ? (
                  <Item label="Rate (informational)">
                    {procurement.rate}
                    {procurement.unit ? ` ${procurement.unit}` : ''}
                    <span className="ml-1 text-xs text-muted-foreground">(display only)</span>
                  </Item>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {procurement.summary_en || procurement.summary_hi ? (
            <Card>
              <CardHeader title="Summary" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={procurement.summary_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={procurement.summary_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          {procurement.description_en || procurement.description_hi ? (
            <Card>
              <CardHeader title="Description" />
              <CardContent>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en">
                    <Block body={procurement.description_en} />
                  </TabsContent>
                  <TabsContent value="hi">
                    <Block body={procurement.description_hi} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          {procurement.document ? (
            <Card>
              <CardHeader title="Linked document" />
              <CardContent>
                <a
                  href={procurement.document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {procurement.document.title_en}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={procurement.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {procurement.public_url}{' '}
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
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
