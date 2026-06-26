/**
 * `/videos/[id]/edit` — edit a video (Phase 15.4). Permission-gated inside the feature page.
 */
import { VideoFormPage } from '@/features/videos';

export default function EditVideoRoute({ params }: { params: { id: string } }) {
  return <VideoFormPage id={params.id} />;
}
