/**
 * Event timeline — a read-only summary of the record's lifecycle timestamps (created, last
 * updated, published, archived) plus the current status/state. Built from fields already in the
 * event detail; no extra fetch. (Full per-action audit history lives in the Audit Log module.)
 */

import { CalendarPlus, PencilLine, Send, Archive, Activity } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { formatDateTime } from '@/utils/date';
import type { EventDetail } from '../types';
import { EventStatusBadge } from './event-status-badge';

export function EventTimeline({ event }: { event: EventDetail }) {
  const rows: Array<{ icon: typeof CalendarPlus; label: string; value: React.ReactNode }> = [
    { icon: Activity, label: 'Current status', value: <EventStatusBadge status={event.event_status} /> },
    { icon: Send, label: 'Publication', value: <StatusBadge state={event.publication_state} /> },
    { icon: CalendarPlus, label: 'Created', value: formatDateTime(event.created_at) },
    { icon: PencilLine, label: 'Last updated', value: formatDateTime(event.updated_at) },
    { icon: Send, label: 'Published', value: event.published_at ? formatDateTime(event.published_at) : '—' },
    { icon: Archive, label: 'Archived', value: event.archived_at ? formatDateTime(event.archived_at) : '—' },
  ];

  return (
    <Card>
      <CardHeader title="Timeline" />
      <CardContent>
        <ol className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium text-foreground">{row.value}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
