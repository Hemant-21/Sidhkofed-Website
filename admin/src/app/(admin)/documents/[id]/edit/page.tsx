/**
 * `/documents/[id]/edit` — edit a document (Phase 15.4). Permission-gated inside the feature page.
 */
import { DocumentFormPage } from '@/features/documents';

export default function EditDocumentRoute({ params }: { params: { id: string } }) {
  return <DocumentFormPage id={params.id} />;
}
