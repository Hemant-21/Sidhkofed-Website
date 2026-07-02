/**
 * `/official-communications/[id]/edit` — edit a communication (Phase 15.6).
 */
import { CommunicationFormPage } from '@/features/communications';

export default function EditCommunicationRoute({ params }: { params: { id: string } }) {
  return <CommunicationFormPage id={params.id} />;
}
