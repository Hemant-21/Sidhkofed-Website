/**
 * `/news/[id]` — news detail / view (Phase 15.3).
 */
import { NewsDetailPage } from '@/features/news';

export default function NewsDetailRoute({ params }: { params: { id: string } }) {
  return <NewsDetailPage id={params.id} />;
}
