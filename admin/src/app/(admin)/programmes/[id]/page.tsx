/**
 * `/programmes/[id]` — programme detail / view (Phase 15.5).
 */
import { ProgrammeDetailPage } from '@/features/programmes';

export default function ProgrammeDetailRoute({ params }: { params: { id: string } }) {
  return <ProgrammeDetailPage id={params.id} />;
}
