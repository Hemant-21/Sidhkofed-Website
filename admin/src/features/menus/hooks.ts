'use client';

/**
 * Menu data hooks. React Query wrappers over the menus API (api.ts) reusing the shared query-key
 * namespace + invalidation helpers (no bespoke cache plumbing). Mutations toast their outcome since
 * they are explicit user actions; the create/update form opts out of error toasts so the <Form>
 * wrapper can map 422 field errors instead.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import {
  MENU_RESOURCE,
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  reorderMenuItems,
  deleteMenuItem,
} from './api';
import type { MenuItem, MenuItemWriteInput, MenuLocation, MenuReorderInput } from './types';

const keys = queryKeys.resource(MENU_RESOURCE);
const locationKey = (location?: MenuLocation) => [MENU_RESOURCE, 'list', { location: location ?? null }] as const;

/** Flat menu-item list for one location (the editor groups it into a tree). */
export function useMenuItems(location?: MenuLocation) {
  return useQuery({
    queryKey: locationKey(location),
    queryFn: () => listMenuItems(location ? { location } : undefined),
    staleTime: 30_000,
  });
}

export function useMenuItem(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getMenuItem(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MenuItemWriteInput) => createMenuItem(body),
    onSuccess: () => void invalidateResource(queryClient, MENU_RESOURCE),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MenuItemWriteInput }) => updateMenuItem(id, body),
    onSuccess: (_data, vars) => {
      void invalidateResource(queryClient, MENU_RESOURCE);
      void queryClient.invalidateQueries({ queryKey: keys.detail(vars.id) });
    },
  });
}

/** Activate / deactivate via PATCH `is_active`. Toasts the outcome (explicit user action). */
export function useToggleMenuActive() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateMenuItem(id, { is_active }),
    onSuccess: (item: MenuItem) => {
      void invalidateResource(queryClient, MENU_RESOURCE);
      toast.success(item.is_active ? 'Menu item activated.' : 'Menu item deactivated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Persist a sibling reorder (move up/down). */
export function useReorderMenuItems() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: MenuReorderInput) => reorderMenuItems(body),
    onSuccess: () => void invalidateResource(queryClient, MENU_RESOURCE),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => {
      void invalidateResource(queryClient, MENU_RESOURCE);
      toast.success('Menu item deleted.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
