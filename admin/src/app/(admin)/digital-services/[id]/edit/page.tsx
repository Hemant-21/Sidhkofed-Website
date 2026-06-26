/**
 * `/digital-services/[id]/edit` — edit a digital service (Phase 15.7).
 */
import { DigitalServiceFormPage } from '@/features/digital-services';

export default function EditDigitalServiceRoute({ params }: { params: { id: string } }) {
  return <DigitalServiceFormPage id={params.id} />;
}
