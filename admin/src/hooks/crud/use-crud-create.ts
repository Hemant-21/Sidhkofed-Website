'use client';

/**
 * `useCrudCreate` — reusable create mutation. Invalidates the resource's lists on
 * success and (optionally) toasts. Errors are NOT toasted by default so the
 * reusable <Form> wrapper can map 422 field errors onto inputs; use `mutateAsync`
 * inside the form's submit handler and let it surface validation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { useResourceApi } from './use-resource-api';
import type { CrudMutationOptions } from './crud-mutation-options';

export function useCrudCreate<TCreate, TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, TCreate> = {},
) {
  const api = useResourceApi<unknown, TDetail, TCreate>(resource);
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (body: TCreate) => api.create(body),
    onSuccess: (data, vars) => {
      void invalidateResource(queryClient, resource);
      if (options.toastOnSuccess !== false) {
        toast.success(options.successMessage ?? 'Created successfully.');
      }
      options.onSuccess?.(data, vars);
    },
    onError: (error, vars) => {
      if (options.toastOnError) toast.error(errorMessage(error));
      options.onError?.(error, vars);
    },
  });
}
