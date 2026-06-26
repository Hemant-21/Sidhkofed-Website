'use client';

/**
 * Reusable publishing-lifecycle mutations (API spec §3): publish / unpublish /
 * archive / restore. Each takes a record id, invalidates the resource lists + that
 * detail entry, and toasts the outcome (success and error by default, since these
 * are explicit user actions, not form submits). Permission gating is the caller's
 * job via <Can> / PermissionButton — the backend remains the security boundary.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateDetail, invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import type { ResourceApi } from '@/lib/api/crud-factory';
import { useToast } from '@/hooks/use-toast';
import { useResourceApi } from './use-resource-api';
import type { CrudMutationOptions } from './crud-mutation-options';

type ActionPicker<TDetail> = (api: ResourceApi<unknown, TDetail>) => (id: string) => Promise<TDetail>;

/** Internal: build a `(id) => action` mutation with shared invalidate/toast wiring. */
function useActionMutation<TDetail>(
  resource: string,
  pick: ActionPicker<TDetail>,
  defaultMessage: string,
  options: CrudMutationOptions<TDetail, string>,
) {
  const api = useResourceApi<unknown, TDetail>(resource);
  const queryClient = useQueryClient();
  const toast = useToast();
  const action = pick(api);

  return useMutation({
    mutationFn: (id: string) => action(id),
    onSuccess: (data, id) => {
      void invalidateResource(queryClient, resource);
      void invalidateDetail(queryClient, resource, id);
      if (options.toastOnSuccess !== false) {
        toast.success(options.successMessage ?? defaultMessage);
      }
      options.onSuccess?.(data, id);
    },
    onError: (error, id) => {
      if (options.toastOnError !== false) toast.error(errorMessage(error));
      options.onError?.(error, id);
    },
  });
}

export function usePublish<TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, string> = {},
) {
  return useActionMutation<TDetail>(resource, (a) => a.publish, 'Published.', options);
}

export function useUnpublish<TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, string> = {},
) {
  return useActionMutation<TDetail>(resource, (a) => a.unpublish, 'Unpublished.', options);
}

export function useArchive<TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, string> = {},
) {
  return useActionMutation<TDetail>(resource, (a) => a.archive, 'Archived.', options);
}

export function useRestore<TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, string> = {},
) {
  return useActionMutation<TDetail>(resource, (a) => a.restore, 'Restored.', options);
}

/**
 * Aggregate convenience: all four lifecycle mutations for a resource in one call.
 *
 *   const { publish, archive, restore } = useLifecycleActions('events');
 *   publish.mutate(id);
 */
export function useLifecycleActions<TDetail = unknown>(
  resource: string,
  options: CrudMutationOptions<TDetail, string> = {},
) {
  return {
    publish: usePublish<TDetail>(resource, options),
    unpublish: useUnpublish<TDetail>(resource, options),
    archive: useArchive<TDetail>(resource, options),
    restore: useRestore<TDetail>(resource, options),
  };
}
