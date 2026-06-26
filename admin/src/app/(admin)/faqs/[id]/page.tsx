/**
 * `/faqs/[id]` — FAQ detail / view (Phase 15.7).
 */
import { FaqDetailPage } from '@/features/faqs';

export default function FaqDetailRoute({ params }: { params: { id: string } }) {
  return <FaqDetailPage id={params.id} />;
}
