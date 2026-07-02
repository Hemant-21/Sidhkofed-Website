'use client';

/**
 * `useCrudDelete` — reusable hard-delete mutation. The backend only permits this
 * for a draft, never-published, unlinked record (codex §8); otherwise it returns
 * `409 protected_record`, which is toasted as an error here. Pair it with
 * `useConfirmDialog().confirmDelete(...)` at the call site for the confirmation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { useResourceApi } from './use-resource-api';
import type { CrudMutationOptions } from './crud-mutation-options';

export function useCrudDelete(
  resource: string,
  options: CrudMutationOptions<void, string> = {},
) {
  const api = useResourceApi(resource);
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: (_data, id) => {
      void invalidateResource(queryClient, resource);
      if (options.toastOnSuccess !== false) {
        toast.success(options.successMessage ?? 'Deleted.');
      }
      options.onSuccess?.(undefined, id);
    },
    onError: (error, id) => {
      if (options.toastOnError !== false) toast.error(errorMessage(error));
      options.onError?.(error, id);
    },
  });
}
