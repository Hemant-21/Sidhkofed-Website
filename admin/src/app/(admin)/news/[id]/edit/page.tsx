/**
 * `/news/[id]/edit` — edit a news record (Phase 15.3). Permission-gated inside the feature page.
 */
import { NewsEditPage } from '@/features/news';

export default function EditNewsRoute({ params }: { params: { id: string } }) {
  return <NewsEditPage id={params.id} />;
}
