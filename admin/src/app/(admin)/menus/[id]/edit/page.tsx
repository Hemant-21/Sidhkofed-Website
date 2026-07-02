/**
 * `/menus/[id]/edit` — edit a menu item (Phase 15.7).
 */
import { MenuFormPage } from '@/features/menus';

export default function EditMenuItemRoute({ params }: { params: { id: string } }) {
  return <MenuFormPage id={params.id} />;
}
