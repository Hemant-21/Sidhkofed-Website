/**
 * `/videos/[id]` — video detail / view (Phase 15.4).
 */
import { VideoDetailPage } from '@/features/videos';

export default function VideoDetailRoute({ params }: { params: { id: string } }) {
  return <VideoDetailPage id={params.id} />;
}
