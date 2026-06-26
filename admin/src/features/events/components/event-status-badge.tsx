import { Badge } from '@/components/ui/badge';
import type { EventStatus } from '../types';
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from '../event-status';

/**
 * Read-only event-status badge. The status is the backend-derived value (never recomputed
 * here). Conveyed by label + colour (WCAG: never colour alone).
 */
export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge tone={EVENT_STATUS_TONE[status]} dot>
      {EVENT_STATUS_LABEL[status]}
    </Badge>
  );
}
