/**
 * `/galleries/[id]/edit` — edit a gallery (Phase 15.7 remediation).
 */
import { GalleryFormPage } from '@/features/galleries';

export default function EditGalleryRoute({ params }: { params: { id: string } }) {
  return <GalleryFormPage id={params.id} />;
}
