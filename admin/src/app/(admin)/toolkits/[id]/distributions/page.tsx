/**
 * `/toolkits/[id]/distributions` — read-only distribution summary for a toolkit (Phase 15.5).
 * Displays the backend-calculated aggregate of per-event distribution figures. Per-event
 * distributions are authored from the Events module; this page is read-only.
 */
import { ToolkitDistributionsPage } from '@/features/toolkits';

export default function ToolkitDistributionsRoute({ params }: { params: { id: string } }) {
  return <ToolkitDistributionsPage id={params.id} />;
}
