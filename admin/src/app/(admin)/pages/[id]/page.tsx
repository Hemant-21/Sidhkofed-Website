/**
 * `/pages/[id]` — page detail / view (Phase 15.7).
 */
import { PageDetailPage } from '@/features/pages';

export default function PageDetailRoute({ params }: { params: { id: string } }) {
  return <PageDetailPage id={params.id} />;
}
