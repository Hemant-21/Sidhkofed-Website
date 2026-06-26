/**
 * `/events/[id]` — event detail / view (Phase 15.3).
 */
import { EventDetailPage } from '@/features/events';

export default function EventDetailRoute({ params }: { params: { id: string } }) {
  return <EventDetailPage id={params.id} />;
}
