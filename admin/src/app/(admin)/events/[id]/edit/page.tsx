/**
 * `/events/[id]/edit` — edit an event (Phase 15.3). Permission-gated inside the feature page.
 */
import { EventFormPage } from '@/features/events';

export default function EditEventRoute({ params }: { params: { id: string } }) {
  return <EventFormPage id={params.id} />;
}
