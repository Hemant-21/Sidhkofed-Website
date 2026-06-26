/**
 * `/menus/[id]` — menu item detail / view (Phase 15.7).
 */
import { MenuDetailPage } from '@/features/menus';

export default function MenuItemDetailRoute({ params }: { params: { id: string } }) {
  return <MenuDetailPage id={params.id} />;
}
