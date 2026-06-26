import Link from 'next/link';
import type { ColumnDef } from '@/types/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import {
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  type MembershipSummary,
  type MembershipLevel,
  type MembershipType,
} from '../types';

/** Membership list columns. Sortable fields map to the backend allow-list (memberships.types.ts). */
export function membershipColumns(actions?: (row: MembershipSummary) => React.ReactNode): ColumnDef<MembershipSummary>[] {
  const cols: ColumnDef<MembershipSummary>[] = [
    {
      id: 'institution',
      header: 'Institution',
      cell: (m) => (
        <div className="min-w-0">
          <Link href={`${ROUTES.memberships}/${m.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
            {m.institution?.name_en ?? '—'}
          </Link>
          {m.membership_number ? <p className="truncate text-xs text-muted-foreground">#{m.membership_number}</p> : null}
        </div>
      ),
    },
    {
      id: 'level',
      header: 'Level',
      cell: (m) => <span className="text-muted-foreground">{MEMBERSHIP_LEVEL_LABEL[m.membership_level as MembershipLevel] ?? m.membership_level}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      defaultHidden: true,
      cell: (m) => <span className="text-muted-foreground">{MEMBERSHIP_TYPE_LABEL[m.membership_type as MembershipType] ?? m.membership_type}</span>,
    },
    {
      id: 'district',
      header: 'District',
      cell: (m) => <span className="text-muted-foreground">{m.district?.name_en ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Member status',
      align: 'center',
      cell: (m) => <Badge tone={m.status === 'active' ? 'success' : 'muted'}>{m.status}</Badge>,
    },
    {
      id: 'publication_state',
      header: 'State',
      cell: (m) => <StatusBadge state={m.publication_state} />,
    },
    {
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
