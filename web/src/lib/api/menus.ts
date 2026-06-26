import 'server-only';
import { getOneSafe } from './server';
import { PUBLIC_ENDPOINTS } from './endpoints';
import type { MenuItem } from '@/lib/types/content';

export type MenuLocation = 'header' | 'footer' | 'utility';

/**
 * Fetch a backend menu tree for a location. Never throws — navigation must always
 * render, so a failure yields an empty menu (the chrome degrades gracefully).
 * Menus change rarely; cache them for a longer ISR window.
 */
export async function getMenu(location: MenuLocation): Promise<MenuItem[]> {
  const tree = await getOneSafe<MenuItem[]>(PUBLIC_ENDPOINTS.menus, {
    query: { location },
    revalidate: 600,
    tags: [`menu:${location}`],
  });
  return tree ?? [];
}
