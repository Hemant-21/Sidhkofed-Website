'use client';

/**
 * Memoized resource client. Wraps `createResourceApi` so every CRUD hook on a page
 * shares one instance per resource (stable across re-renders). This is the single
 * place hooks obtain the typed list/detail/create/update/lifecycle methods.
 */

import { useMemo } from 'react';
import { createResourceApi, type ResourceApi } from '@/lib/api/crud-factory';

export function useResourceApi<
  TSummary,
  TDetail = TSummary,
  TCreate = unknown,
  TUpdate = Partial<TCreate>,
>(resource: string): ResourceApi<TSummary, TDetail, TCreate, TUpdate> {
  return useMemo(
    () => createResourceApi<TSummary, TDetail, TCreate, TUpdate>(resource),
    [resource],
  );
}
