'use client';

/**
 * `useCrudUpdate` — reusable partial-update (PATCH) mutation. Invalidates both the
 * lists and the affected detail entry on success. Like create, it does not toast
 * errors by default so the <Form> wrapper can map server validation onto fields.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateDetail, invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { useResourceApi } from './use-resource-api';
import type { CrudMutationOptions } from './crud-mutation-options';

export interface UpdateVars<TUpdate> {
  id: string;
  body: TUpdate;
}

export function useCrudUpdate<TUpdate, TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, UpdateVars<TUpdate>> = {},
) {
  const api = useResourceApi<unknown, TDetail, unknown, TUpdate>(resource);
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, body }: UpdateVars<TUpdate>) => api.update(id, body),
    onSuccess: (data, vars) => {
      void invalidateResource(queryClient, resource);
      void invalidateDetail(queryClient, resource, vars.id);
      if (options.toastOnSuccess !== false) {
        toast.success(options.successMessage ?? 'Changes saved.');
      }
      options.onSuccess?.(data, vars);
    },
    onError: (error, vars) => {
      if (options.toastOnError) toast.error(errorMessage(error));
      options.onError?.(error, vars);
    },
  });
}
