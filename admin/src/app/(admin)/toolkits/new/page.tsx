/**
 * `/toolkits/new` — create a toolkit (Phase 15.5). Permission-gated inside the feature page.
 * Catalogue items are managed from the detail page once the toolkit has been saved.
 */
import { ToolkitFormPage } from '@/features/toolkits';

export default function NewToolkitRoute() {
  return <ToolkitFormPage />;
}
