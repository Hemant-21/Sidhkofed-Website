/**
 * `/documents/[id]` — document detail / view (Phase 15.4).
 */
import { DocumentDetailPage } from '@/features/documents';

export default function DocumentDetailRoute({ params }: { params: { id: string } }) {
  return <DocumentDetailPage id={params.id} />;
}
