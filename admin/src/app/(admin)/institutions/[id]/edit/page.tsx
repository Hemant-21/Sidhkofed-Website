/**
 * `/institutions/[id]/edit` — edit an institution (Phase 15.5). Permission-gated inside the feature page.
 */
import { InstitutionFormPage } from '@/features/institutions';

export default function EditInstitutionRoute({ params }: { params: { id: string } }) {
  return <InstitutionFormPage id={params.id} />;
}
