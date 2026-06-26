/**
 * `/galleries/[id]` — gallery detail / view + image management (Phase 15.7 remediation).
 */
import { GalleryDetailPage } from '@/features/galleries';

export default function GalleryDetailRoute({ params }: { params: { id: string } }) {
  return <GalleryDetailPage id={params.id} />;
}
