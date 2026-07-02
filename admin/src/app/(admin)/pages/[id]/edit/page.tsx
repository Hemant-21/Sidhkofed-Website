/**
 * `/pages/[id]/edit` — edit a page (Phase 15.7).
 */
import { PageFormPage } from '@/features/pages';

export default function EditPageRoute({ params }: { params: { id: string } }) {
  return <PageFormPage id={params.id} />;
}
