'use client';

/**
 * Toolkits data layer. Standard list/detail/create/update/lifecycle come from the shared CRUD hooks
 * against the `toolkits` resource — no bespoke fetch logic. This module adds the toolkit-SPECIFIC
 * sub-resources that aren't part of the generic "P" pattern:
 *   - nested catalogue ITEM mutations (`/admin/toolkits/{id}/items` — toolkit_items.* CRUD), and
 *   - the read-only public DISTRIBUTION SUMMARY aggregate (`/public/toolkits/{slug}/distribution-
 *     summary`) whose totals are calculated by the backend (never in the frontend).
 *
 * Per-event distribution figures are authored under the Events module (out of this module's scope);
 * here the toolkit-level figures are surfaced read-only.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { get, post, patch, del } from '@/lib/api/http';
import { invalidateDetail, invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import type { ToolkitItem, ToolkitItemWriteInput, PublicDistributionSummary } from './types';

export const TOOLKITS_RESOURCE = 'toolkits';

export { TOOLKIT_PERMS, TOOLKIT_ITEM_PERMS } from './permissions';

const itemsBase = (toolkitId: string) => `${adminResource(TOOLKITS_RESOURCE).detail(toolkitId)}/items`;
const itemPath = (toolkitId: string, itemId: string) => `${itemsBase(toolkitId)}/${encodeURIComponent(itemId)}`;

/** Invalidate the parent toolkit detail (which embeds `items`) + the resource lists. */
function useInvalidateToolkit() {
  const queryClient = useQueryClient();
  return (toolkitId: string) => {
    void invalidateDetail(queryClient, TOOLKITS_RESOURCE, toolkitId);
    void invalidateResource(queryClient, TOOLKITS_RESOURCE);
  };
}

/** Create a catalogue item under a toolkit (POST /admin/toolkits/{id}/items). */
export function useCreateToolkitItem() {
  const invalidate = useInvalidateToolkit();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ toolkitId, body }: { toolkitId: string; body: ToolkitItemWriteInput }) =>
      post<ToolkitItem, ToolkitItemWriteInput>(itemsBase(toolkitId), body),
    onSuccess: (_data, { toolkitId }) => {
      invalidate(toolkitId);
      toast.success('Item added.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Update a catalogue item (PATCH /admin/toolkits/{id}/items/{item_id}). */
export function useUpdateToolkitItem() {
  const invalidate = useInvalidateToolkit();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ toolkitId, itemId, body }: { toolkitId: string; itemId: string; body: ToolkitItemWriteInput }) =>
      patch<ToolkitItem, ToolkitItemWriteInput>(itemPath(toolkitId, itemId), body),
    onSuccess: (_data, { toolkitId }) => {
      invalidate(toolkitId);
      toast.success('Item updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Delete a catalogue item (DELETE /admin/toolkits/{id}/items/{item_id}). */
export function useDeleteToolkitItem() {
  const invalidate = useInvalidateToolkit();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ toolkitId, itemId }: { toolkitId: string; itemId: string }) => del<void>(itemPath(toolkitId, itemId)),
    onSuccess: (_data, { toolkitId }) => {
      invalidate(toolkitId);
      toast.success('Item removed.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/**
 * Read-only aggregated distribution summary for a published toolkit (totals computed by the
 * backend). The public endpoint resolves only published toolkits, so the query is disabled until a
 * slug is present and treats a 404 (e.g. an unpublished toolkit) as "no aggregate yet".
 */
export function useToolkitDistributionSummary(slug: string | undefined) {
  return useQuery({
    queryKey: ['toolkits', 'distribution-summary', slug ?? ''],
    queryFn: () => get<PublicDistributionSummary>(`/public/toolkits/${encodeURIComponent(slug as string)}/distribution-summary`),
    enabled: Boolean(slug),
    retry: false,
    staleTime: 60_000,
  });
}
