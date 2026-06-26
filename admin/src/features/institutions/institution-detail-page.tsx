'use client';

/**
 * Institution detail / view page. Read-only presentation of one institution plus the lifecycle
 * actions. Bilingual content shows in tabs. The external website opens safely in a new tab (codex
 * §4.4). Linked records use the compact references the backend returns. Loading/error states are
 * the shared components.
 */

import { ExternalLink, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { INSTITUTIONS_RESOURCE } from './api';
import type { InstitutionDetail } from './types';
import { InstitutionLifecycleActions } from './components/institution-lifecycle-actions';

export function InstitutionDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<InstitutionDetail>(INSTITUTIONS_RESOURCE, id);
  const institution = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !institution) {
    return (
      <div className="space-y-6">
        <PageHeader title="Institution" breadcrumbs={[{ label: 'Institutions', href: ROUTES.institutions }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={institution.name_en}
        description={institution.name_hi ?? undefined}
        breadcrumbs={[{ label: 'Institutions', href: ROUTES.institutions }, { label: institution.name_en }]}
        actions={<InstitutionLifecycleActions institution={institution} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={institution.publication_state} />
        <Badge tone="default">{institution.institution_type.name_en}</Badge>
        {institution.district ? <Badge tone="default">{institution.district.name_en}</Badge> : null}
        {institution.highlight_type ? <HighlightBadge highlight={institution.highlight_type} /> : null}
        {institution.show_on_homepage ? <Badge tone="info">Homepage partner</Badge> : null}
        {!institution.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardContent>
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                </TabsList>
                <TabsContent value="en">
                  <ContentBlock body={institution.description_en} />
                </TabsContent>
                <TabsContent value="hi">
                  <ContentBlock body={institution.description_hi} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Contact & address" />
            <CardContent className="space-y-3">
              <Line icon={Mail} label="Email">
                {institution.contact_email ? (
                  <a href={`mailto:${institution.contact_email}`} className="text-primary hover:underline">
                    {institution.contact_email}
                  </a>
                ) : (
                  '—'
                )}
              </Line>
              <Line icon={Phone} label="Phone">
                {institution.contact_phone ?? '—'}
              </Line>
              <Line icon={MapPin} label="Address">
                {institution.address_en ? (
                  <span className="whitespace-pre-wrap">{institution.address_en}</span>
                ) : (
                  '—'
                )}
              </Line>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Logo" />
            <CardContent>
              {institution.logo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={institution.logo.url}
                  alt={institution.logo.alt_text ?? `${institution.name_en} logo`}
                  className="max-h-32 w-auto object-contain"
                />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Building2 className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 text-sm">
              {institution.website_url ? (
                <div>
                  <p className="text-muted-foreground">Website</p>
                  <a
                    href={institution.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    {institution.website_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground">Public URL</p>
                <a
                  href={institution.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                >
                  {institution.public_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              {institution.display_order != null ? (
                <div>
                  <p className="text-muted-foreground">Display order</p>
                  <p className="text-foreground">{institution.display_order}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
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
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
