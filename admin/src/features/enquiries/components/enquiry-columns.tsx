import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@/types/table';
import type { StatusTone } from '@/constants/status';
import { formatDateTime } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import { SPAM_STATE_LABEL, type EnquirySummary, type SpamState } from '../types';

const SPAM_TONE: Record<SpamState, StatusTone> = {
  clean: 'success',
  suspected: 'warning',
  spam: 'danger',
};

/** Enquiry list column definitions. Sortable fields match the backend ordering allow-list. */
export function enquiryColumns(): ColumnDef<EnquirySummary>[] {
  return [
    {
      id: 'submitted_at',
      header: 'Submitted',
      sortField: 'submitted_at',
      cell: (e) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground" title={e.submitted_at}>
          {formatDateTime(e.submitted_at)}
        </span>
      ),
    },
    {
      id: 'enquiry_type',
      header: 'Type',
      cell: (e) => <span className="text-sm text-foreground">{e.enquiry_type.name_en}</span>,
    },
    {
      id: 'name',
      header: 'From',
      cell: (e) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{e.name}</p>
          <p className="truncate text-xs text-muted-foreground">{e.email}</p>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (e) => (
        <span className="block max-w-xs truncate text-sm text-foreground" title={e.subject}>
          {e.subject}
        </span>
      ),
    },
    {
      id: 'organization',
      header: 'Organisation',
      defaultHidden: true,
      cell: (e) => <span className="text-sm text-muted-foreground">{e.organization ?? '—'}</span>,
    },
    {
      id: 'spam_state',
      header: 'Spam state',
      cell: (e) => <Badge tone={SPAM_TONE[e.spam_state]}>{SPAM_STATE_LABEL[e.spam_state]}</Badge>,
    },
    {
      id: 'archived_at',
      header: 'Status',
      cell: (e) => (e.archived_at ? <Badge tone="muted">Archived</Badge> : <Badge tone="info">Active</Badge>),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (e) => (
        <Link href={`${ROUTES.enquiries}/${e.id}`} className="text-sm text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];
}
