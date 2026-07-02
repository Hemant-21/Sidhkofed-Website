'use client';

/**
 * Documents data layer. Standard list/detail/create/update/lifecycle come from the shared CRUD
 * hooks against the `documents` resource — no bespoke fetch logic. This module only adds the
 * document-SPECIFIC action that isn't part of the generic "P" pattern: replace-file (version
 * management — swap the underlying asset, preserving the document id/slug — backend is the source
 * of truth for versioning, codex §4.5).
 *
 * Documents are authorized with the shared `content.*` permission set (documents.routes.ts), so the
 * permission keys are reused from the events feature rather than redefined.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { adminResource, MASTERS } from '@/constants/api-endpoints';
import { get, getList, post } from '@/lib/api/http';
import { invalidateDetail, invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { PAGE_SIZE_MAX } from '@/constants/app';
import type { SelectOption } from '@/components/ui/select';
import type { DocumentDetail } from './types';

export const DOCUMENTS_RESOURCE = 'documents';

/** Documents reuse the shared content RBAC keys (documents.routes.ts maps to `content.*`). */
export { CONTENT_PERMS } from '@/features/events/permissions';

const docPath = (id: string, action: string) => `${adminResource(DOCUMENTS_RESOURCE).detail(id)}/${action}`;

/**
 * Replace the underlying file asset of a document (POST /admin/documents/{id}/replace-file).
 * The document id and slug are preserved; only `file_asset_id` is swapped. Restricted to
 * Super Admin + Publisher by the backend.
 */
export function useReplaceDocumentFile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, fileAssetId }: { id: string; fileAssetId: string }) =>
      post<DocumentDetail, { file_asset_id: string }>(docPath(id, 'replace-file'), { file_asset_id: fileAssetId }),
    onSuccess: (_data, { id }) => {
      void invalidateResource(queryClient, DOCUMENTS_RESOURCE);
      void invalidateDetail(queryClient, DOCUMENTS_RESOURCE, id);
      toast.success('Document file replaced.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/**
 * Financial-year options. The `financial-years` master serializes to `{ id, label }` (no
 * `name_en`), so the generic `useMasterOptions` cannot label it — this maps `label` instead.
 */
export function useFinancialYearOptions(): { options: SelectOption[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['master', 'financial-years', 'options'],
    queryFn: () => getList<{ id: string; label: string; is_active?: boolean }>(MASTERS.admin('financial-years'), {
      page_size: PAGE_SIZE_MAX,
    }),
    staleTime: 5 * 60_000,
  });
  const options: SelectOption[] = (query.data?.items ?? []).map((fy) => ({
    value: fy.id,
    label: fy.label,
    disabled: fy.is_active === false,
  }));
  return { options, isLoading: query.isLoading };
}

/** Re-export a typed detail fetch for any caller that needs it outside the CRUD hook. */
export const fetchDocument = (id: string) => get<DocumentDetail>(adminResource(DOCUMENTS_RESOURCE).detail(id));
