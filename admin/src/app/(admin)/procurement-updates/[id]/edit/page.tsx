/**
 * `/procurement-updates/[id]/edit` — edit a procurement update (Phase 15.6).
 */
import { ProcurementFormPage } from '@/features/procurement';

export default function EditProcurementRoute({ params }: { params: { id: string } }) {
  return <ProcurementFormPage id={params.id} />;
}
