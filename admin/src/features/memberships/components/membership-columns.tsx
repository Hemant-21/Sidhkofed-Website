import Link from 'next/link';
<<<<<<< HEAD
import type { ColumnDef } from '@/types/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/utils/date';
=======
import { Home } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatRelative } from '@/utils/date';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
import { ROUTES } from '@/constants/routes';
import {
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
<<<<<<< HEAD
  type MembershipSummary,
  type MembershipLevel,
  type MembershipType,
} from '../types';

/** Membership list columns. Sortable fields map to the backend allow-list (memberships.types.ts). */
export function membershipColumns(actions?: (row: MembershipSummary) => React.ReactNode): ColumnDef<MembershipSummary>[] {
=======
  MEMBERSHIP_STATUS_LABEL,
  type MembershipSummary,
} from '../types';

/**
 * Institutional Membership list column definitions. Sort fields map to the backend ordering
 * allow-list (memberships.types.ts): `display_order`, `join_date`, `published_at`, `created_at`.
 * Columns follow the task spec: Membership Number, Institution, District, Type, Level, Reporting
 * Period, Status, Publication State, Updated, Actions.
 */
export function membershipColumns(
  actions?: (row: MembershipSummary) => React.ReactNode,
): ColumnDef<MembershipSummary>[] {
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  const cols: ColumnDef<MembershipSummary>[] = [
    {
      id: 'institution',
      header: 'Institution',
      cell: (m) => (
        <div className="min-w-0">
<<<<<<< HEAD
          <Link href={`${ROUTES.memberships}/${m.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
            {m.institution?.name_en ?? '—'}
          </Link>
          {m.membership_number ? <p className="truncate text-xs text-muted-foreground">#{m.membership_number}</p> : null}
=======
          <Link
            href={`${ROUTES.memberships}/${m.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {m.institution?.name_en ?? '—'}
          </Link>
          {m.membership_number ? (
            <p className="truncate text-xs text-muted-foreground">No. {m.membership_number}</p>
          ) : null}
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        </div>
      ),
    },
    {
<<<<<<< HEAD
      id: 'level',
      header: 'Level',
      cell: (m) => <span className="text-muted-foreground">{MEMBERSHIP_LEVEL_LABEL[m.membership_level as MembershipLevel] ?? m.membership_level}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      defaultHidden: true,
      cell: (m) => <span className="text-muted-foreground">{MEMBERSHIP_TYPE_LABEL[m.membership_type as MembershipType] ?? m.membership_type}</span>,
=======
      id: 'membership_number',
      header: 'Membership No.',
      defaultHidden: true,
      cell: (m) => <span className="text-muted-foreground">{m.membership_number ?? '—'}</span>,
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    },
    {
      id: 'district',
      header: 'District',
      cell: (m) => <span className="text-muted-foreground">{m.district?.name_en ?? '—'}</span>,
    },
    {
<<<<<<< HEAD
      id: 'status',
      header: 'Member status',
      align: 'center',
      cell: (m) => <Badge tone={m.status === 'active' ? 'success' : 'muted'}>{m.status}</Badge>,
=======
      id: 'membership_type',
      header: 'Type',
      align: 'center',
      cell: (m) => <Badge tone="default">{MEMBERSHIP_TYPE_LABEL[m.membership_type]}</Badge>,
    },
    {
      id: 'membership_level',
      header: 'Level',
      cell: (m) => (
        <Badge tone={m.membership_level === 'sidhkofed' ? 'info' : 'default'}>
          {MEMBERSHIP_LEVEL_LABEL[m.membership_level]}
        </Badge>
      ),
    },
    {
      id: 'reporting_period',
      header: 'Reporting period',
      defaultHidden: true,
      cell: (m) => (
        <span className="text-muted-foreground">{m.reporting_period?.name_en ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (m) => (
        <Badge tone={m.status === 'active' ? 'success' : 'muted'}>
          {MEMBERSHIP_STATUS_LABEL[m.status]}
        </Badge>
      ),
    },
    {
      id: 'join_date',
      header: 'Joined',
      sortField: 'join_date',
      defaultHidden: true,
      cell: (m) => formatDate(m.join_date),
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (m) => <StatusBadge state={m.publication_state} />,
    },
    {
<<<<<<< HEAD
=======
      id: 'show_on_homepage',
      header: 'Home',
      align: 'center',
      defaultHidden: true,
      cell: (m) =>
        m.show_on_homepage ? (
          <Home className="mx-auto h-4 w-4 text-primary" aria-label="Shown on homepage" />
        ) : (
          <span className="sr-only">Not on homepage</span>
        ),
    },
    {
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
      id: 'updated_at',
      header: 'Updated',
      sortField: 'created_at',
      cell: (m) => (
        <span className="text-muted-foreground" title={m.updated_at}>
          {formatRelative(m.updated_at)}
        </span>
      ),
    },
  ];

  if (actions) {
    cols.push({
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      isActionColumn: true,
      align: 'right',
      cell: (m) => actions(m),
    });
  }
  return cols;
}
