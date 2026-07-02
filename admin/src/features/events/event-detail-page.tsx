'use client';

/**
 * Event detail / view page. Read-only presentation of one event plus the lifecycle/status actions,
 * the completion panel (publish-as-news lives there), and the timeline. Bilingual content shows in
 * tabs; HTML description is rendered as escaped text (no XSS). Linked records use the same compact
 * references the backend returns. Loading/error/forbidden states are the shared components.
 */

import Link from 'next/link';
import { ExternalLink, FileText, Images, Newspaper } from 'lucide-react';
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
import { EVENTS_RESOURCE, useEventFieldDefinitions } from './api';
import { DATE_MODE_LABEL } from './event-status';
import type { EventDetail } from './types';
import { EventStatusBadge } from './components/event-status-badge';
import { EventLifecycleActions } from './components/event-lifecycle-actions';
import { EventCompletionPanel } from './components/event-completion-panel';
import { EventTimeline } from './components/event-timeline';

export function EventDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<EventDetail>(EVENTS_RESOURCE, id);
  const event = detail.data;
  const fieldDefs = useEventFieldDefinitions(event?.event_type.id ?? null);

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !event) {
    return (
      <div className="space-y-6">
        <PageHeader title="Event" breadcrumbs={[{ label: 'Events', href: ROUTES.events }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const dateLabel =
    event.date_mode === 'single'
      ? formatDate(event.start_date)
      : `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title_en}
        description={event.title_hi ?? undefined}
        breadcrumbs={[{ label: 'Events', href: ROUTES.events }, { label: event.title_en }]}
        actions={<EventLifecycleActions event={event} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <EventStatusBadge status={event.event_status} />
        <StatusBadge state={event.publication_state} />
        <Badge tone="default">{event.event_type.name_en}</Badge>
        {event.training_type ? <Badge tone="default">{event.training_type.name_en}</Badge> : null}
        {event.highlight_type ? <HighlightBadge highlight={event.highlight_type} /> : null}
        {event.show_on_homepage ? <Badge tone="info">Homepage</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Overview */}
          <Card>
            <CardHeader title="Overview" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Dates">{dateLabel} <span className="text-muted-foreground">({DATE_MODE_LABEL[event.date_mode]})</span></Item>
                <Item label="Location">{event.location_text ?? '—'}</Item>
                <Item label="District">{event.district?.name_en ?? '—'}</Item>
                <Item label="Block">{event.block?.name_en ?? '—'}</Item>
              </dl>
            </CardContent>
          </Card>

          {/* Content (bilingual) */}
          <Card>
            <CardHeader title="Content" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <ContentBlock summary={event.summary_en} body={event.description_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <ContentBlock summary={event.summary_hi} body={event.description_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Dynamic values */}
          {Object.keys(event.dynamic_values).length > 0 ? (
            <Card>
              <CardHeader title="Type-specific details" />
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(event.dynamic_values).map(([key, value]) => {
                    const def = fieldDefs.data?.find((d) => d.field_key === key);
                    return (
                      <Item key={key} label={def?.label_en ?? key}>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </Item>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* Relationships */}
          <Card>
            <CardHeader title="Relationships" />
            <CardContent className="space-y-4">
              <RefList label="Commodities" items={event.commodities.map((c) => c.name_en)} />
              <RefList label="Programmes" items={event.programmes.map((p) => p.title_en)} />
              <RefList label="Institutions" items={event.institutions.map((i) => i.name_en)} />
              <LinkList
                label="Documents"
                icon={FileText}
                items={event.documents.map((d) => ({ key: d.id, text: d.title_en, href: d.file_url, external: true }))}
              />
              <LinkList
                label="Galleries"
                icon={Images}
                items={event.galleries.map((g) => ({ key: g.id, text: `${g.title_en} (${g.image_count})`, href: `${ROUTES.galleries}/${g.id}` }))}
              />
              <LinkList
                label="Published news"
                icon={Newspaper}
                items={event.news.map((n) => ({ key: n.id, text: n.title_en, href: `${ROUTES.news}/${n.id}` }))}
              />
            </CardContent>
          </Card>

          <EventCompletionPanel event={event} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {event.cover_media ? (
            <Card className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.cover_media.url}
                alt={event.cover_media.alt_text ?? event.title_en}
                className="aspect-video w-full object-cover"
              />
            </Card>
          ) : null}
          <EventTimeline event={event} />
          <Card>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">Public URL</p>
              <a
                href={event.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {event.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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

function ContentBlock({ summary, body }: { summary: string | null; body: string | null }) {
  return (
    <div className="space-y-3">
      {summary ? <p className="text-sm font-medium text-foreground">{summary}</p> : null}
      {body ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{body}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">No content provided.</p>
      )}
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

function LinkList({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: typeof FileText;
  items: Array<{ key: string; text: string; href: string; external?: boolean }>;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((i) =>
            i.external ? (
              <li key={i.key}>
                <a href={i.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {i.text}
                </a>
              </li>
            ) : (
              <li key={i.key}>
                <Link href={i.href} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {i.text}
                </Link>
              </li>
            ),
          )}
        </ul>
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
