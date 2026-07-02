/**
 * `/toolkits/[id]/edit` — edit a toolkit (Phase 15.5). Permission-gated inside the feature page.
 * Catalogue items are managed from the detail page, not the edit form.
 */
import { ToolkitFormPage } from '@/features/toolkits';

export default function EditToolkitRoute({ params }: { params: { id: string } }) {
  return <ToolkitFormPage id={params.id} />;
}
