/**
 * `/events/new` — create an event (Phase 15.3). Permission-gated inside the feature page.
 */
import { EventFormPage } from '@/features/events';

export default function NewEventRoute() {
  return <EventFormPage />;
}
