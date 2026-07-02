/**
 * `/programmes/[id]/edit` — edit a programme (Phase 15.5). Permission-gated inside the feature page.
 */
import { ProgrammeFormPage } from '@/features/programmes';

export default function EditProgrammeRoute({ params }: { params: { id: string } }) {
  return <ProgrammeFormPage id={params.id} />;
}
