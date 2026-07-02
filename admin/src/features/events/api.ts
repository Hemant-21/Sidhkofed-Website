'use client';

/**
 * Events data layer. Standard list/detail/create/update/lifecycle come from the shared CRUD
 * hooks (`useCrudList`/`useCrudDetail`/`useCrudCreate`/`useCrudUpdate`/`useLifecycleActions`)
 * against the `events` resource — no bespoke fetch logic. This module only adds the
 * event-SPECIFIC actions that aren't part of the generic "P" pattern: the controlled
 * field-definition lookup, complete, cancel, and publish-as-news.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { queryKeys } from '@/constants/query-keys';
import { get, post } from '@/lib/api/http';
import { invalidateDetail, invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import type {
  EventDetail,
  EventFieldDefinition,
  EventCompleteInput,
  EventCancelInput,
  PublishAsNewsInput,
} from './types';

export const EVENTS_RESOURCE = 'events';
export const NEWS_RESOURCE = 'news';

const eventPath = (id: string, action: string) => `${adminResource(EVENTS_RESOURCE).detail(id)}/${action}`;

/**
 * Active controlled-field definitions for the chosen event type. Drives the dynamic-field
 * section of the form. Only active definitions are rendered (codex §4.1). Disabled until an
 * event type is selected.
 */
export function useEventFieldDefinitions(eventTypeId: string | null | undefined) {
  return useQuery({
    queryKey: ['event-field-definitions', eventTypeId ?? ''],
    queryFn: () =>
      get<EventFieldDefinition[]>(`/admin/event-types/${encodeURIComponent(eventTypeId as string)}/field-definitions`),
    enabled: Boolean(eventTypeId),
    staleTime: 5 * 60_000,
    select: (rows) => rows.filter((r) => r.is_active).sort((a, b) => a.display_order - b.display_order),
  });
}

/** Shared invalidation + toast wiring for the three event-specific POST actions. */
function useEventAction<TBody>(action: string, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) =>
      post<EventDetail, TBody>(eventPath(id, action), body),
    onSuccess: (_data, { id }) => {
      void invalidateResource(queryClient, EVENTS_RESOURCE);
      void invalidateDetail(queryClient, EVENTS_RESOURCE, id);
      toast.success(successMessage);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export const useCompleteEvent = () => useEventAction<EventCompleteInput>('complete', 'Event marked completed.');
export const useCancelEvent = () => useEventAction<EventCancelInput>('cancel', 'Event cancelled.');

/** publish-as-news creates a derived news record; invalidate both events + news caches. */
export function usePublishAsNews() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PublishAsNewsInput }) =>
      post<{ id: string; slug: string }, PublishAsNewsInput>(eventPath(id, 'publish-as-news'), body),
    onSuccess: (_data, { id }) => {
      void invalidateResource(queryClient, EVENTS_RESOURCE);
      void invalidateDetail(queryClient, EVENTS_RESOURCE, id);
      void invalidateResource(queryClient, NEWS_RESOURCE);
      toast.success('Published as news.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Re-export the cache key factory for callers that prefetch event detail. */
export const eventQueryKeys = queryKeys.resource(EVENTS_RESOURCE);
