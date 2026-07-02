/**
 * `/toolkits/[id]` — toolkit detail / view (Phase 15.5).
 */
import { ToolkitDetailPage } from '@/features/toolkits';

export default function ToolkitDetailRoute({ params }: { params: { id: string } }) {
  return <ToolkitDetailPage id={params.id} />;
}
