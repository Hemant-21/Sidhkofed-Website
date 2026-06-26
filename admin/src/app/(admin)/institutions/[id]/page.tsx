/**
 * `/institutions/[id]` — institution detail / view (Phase 15.5).
 */
import { InstitutionDetailPage } from '@/features/institutions';

export default function InstitutionDetailRoute({ params }: { params: { id: string } }) {
  return <InstitutionDetailPage id={params.id} />;
}
