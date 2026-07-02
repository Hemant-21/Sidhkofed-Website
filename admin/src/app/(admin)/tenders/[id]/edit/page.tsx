/**
 * `/tenders/[id]/edit` — edit a tender (Phase 15.6).
 */
import { TenderFormPage } from '@/features/tenders';

export default function EditTenderRoute({ params }: { params: { id: string } }) {
  return <TenderFormPage id={params.id} />;
}
