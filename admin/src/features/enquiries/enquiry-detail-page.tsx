'use client';

/**
 * Enquiry detail page. Read-only presentation of the public submission (contact fields, message,
 * linked commodity/programme) plus the two admin-only affordances the backend actually supports:
 * annotate (internal_notes + spam_state) and archive (enquiries.routes.ts — idempotent, no
 * restore). Publisher + Super Admin only, matching the list page's role gate.
 */
import Link from 'next/link';
import { ArrowLeft, Archive } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { useCrudDetail, useArchive } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { formatDateTime } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import { ENQUIRIES_RESOURCE, ENQUIRY_ROLES } from './api';
import { SPAM_STATE_LABEL, type EnquiryDetail, type SpamState } from './types';
import { EnquiryAnnotatePanel } from './components/enquiry-annotate-panel';

const SPAM_TONE: Record<SpamState, 'success' | 'warning' | 'danger'> = {
  clean: 'success',
  suspected: 'warning',
  spam: 'danger',
};

export function EnquiryDetailPage({ id }: { id: string }) {
  const { hasRole } = usePermissions();
  const allowed = hasRole(ENQUIRY_ROLES);
  const confirm = useConfirmDialog();
  const detail = useCrudDetail<EnquiryDetail>(ENQUIRIES_RESOURCE, id, { enabled: allowed });
  const archive = useArchive<EnquiryDetail>(ENQUIRIES_RESOURCE, { successMessage: 'Enquiry archived.' });
  const enquiry = detail.data;

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Enquiry" breadcrumbs={crumbs('Detail')} />
        <ForbiddenState
          title="Restricted to Publisher / Super Admin"
          description="Public enquiries are managed by Publishers and Super Administrators only."
        />
      </div>
    );
  }

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !enquiry) {
    return (
      <div className="space-y-6">
        <PageHeader title="Enquiry" breadcrumbs={crumbs('Detail')} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={enquiry.subject}
        description={`${enquiry.enquiry_type.name_en} · ${formatDateTime(enquiry.submitted_at)}`}
        breadcrumbs={crumbs(enquiry.subject)}
        actions={
          !enquiry.archived_at ? (
            <Button
              variant="outline"
              size="sm"
              isLoading={archive.isPending}
              onClick={async () => {
                if (await confirm.confirmArchive('this enquiry')) archive.mutate(enquiry.id);
              }}
            >
              <Archive className="h-4 w-4" aria-hidden="true" /> Archive
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SPAM_TONE[enquiry.spam_state]}>{SPAM_STATE_LABEL[enquiry.spam_state]}</Badge>
        {enquiry.archived_at ? <Badge tone="muted">Archived {formatDateTime(enquiry.archived_at)}</Badge> : <Badge tone="info">Active</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Message" />
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{enquiry.message}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Context" description="Linked master data the submitter selected, if any." />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Commodity">{enquiry.commodity?.name_en ?? '—'}</Item>
                <Item label="Programme / scheme">{enquiry.programme_scheme?.title_en ?? '—'}</Item>
                <Item label="Submitted">{formatDateTime(enquiry.submitted_at)}</Item>
                <Item label="Last updated">{formatDateTime(enquiry.updated_at)}</Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Annotation" description="Visible to Publishers/Super Admins only — never shown to the public." />
            <CardContent>
              <EnquiryAnnotatePanel enquiry={enquiry} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Submitted by" />
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{enquiry.name}</p>
              <p className="text-muted-foreground">{enquiry.email}</p>
              <p className="text-muted-foreground">{enquiry.mobile}</p>
              {enquiry.organization ? <p className="text-muted-foreground">{enquiry.organization}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.enquiries} className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to enquiries
        </Link>
      </p>
    </div>
  );
}

const crumbs = (label: string) => [{ label: 'Enquiries', href: ROUTES.enquiries }, { label }];

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
