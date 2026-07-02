/**
 * `/menus/new` — create a menu item (Phase 15.7). Accepts `?location=` to pre-select the menu.
 */
import { MenuFormPage } from '@/features/menus';

export default function NewMenuItemRoute({
  searchParams,
}: {
  searchParams: { location?: string };
}) {
  return <MenuFormPage location={searchParams.location} />;
}
