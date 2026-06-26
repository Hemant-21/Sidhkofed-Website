/**
 * Reusable admin-resource service factory. Given a kebab-case resource name, it
 * returns a fully typed client for the standard "P" pattern (API spec §3) —
 * list/detail/create/update + the four lifecycle actions. This is the mechanism
 * that lets a future module's data layer be ~5 lines instead of a rewrite.
 *
 *   const events = createResourceApi<EventSummary, EventDetail, CreateEventDto>('events');
 *   events.list({ page: 1 }); events.publish(id); ...
 */

import { adminResource } from '@/constants/api-endpoints';
import type { ListQuery } from '@/types/api';
import { del, get, getList, patch, post, type PaginatedResult } from './http';

export interface ResourceApi<TSummary, TDetail = TSummary, TCreate = unknown, TUpdate = Partial<TCreate>> {
  list(query?: ListQuery): Promise<PaginatedResult<TSummary>>;
  get(id: string): Promise<TDetail>;
  create(body: TCreate): Promise<TDetail>;
  update(id: string, body: TUpdate): Promise<TDetail>;
  remove(id: string): Promise<void>;
  publish(id: string): Promise<TDetail>;
  unpublish(id: string): Promise<TDetail>;
  archive(id: string): Promise<TDetail>;
  restore(id: string): Promise<TDetail>;
  /** The raw endpoint map, for module-specific sub-routes. */
  endpoints: ReturnType<typeof adminResource>;
}

export function createResourceApi<
  TSummary,
  TDetail = TSummary,
  TCreate = unknown,
  TUpdate = Partial<TCreate>,
>(resource: string): ResourceApi<TSummary, TDetail, TCreate, TUpdate> {
  const e = adminResource(resource);
  return {
    endpoints: e,
    list: (query) => getList<TSummary>(e.list, query),
    get: (id) => get<TDetail>(e.detail(id)),
    create: (body) => post<TDetail, TCreate>(e.create, body),
    update: (id, body) => patch<TDetail, TUpdate>(e.update(id), body),
    remove: (id) => del<void>(e.detail(id)),
    publish: (id) => post<TDetail>(e.publish(id)),
    unpublish: (id) => post<TDetail>(e.unpublish(id)),
    archive: (id) => post<TDetail>(e.archive(id)),
    restore: (id) => post<TDetail>(e.restore(id)),
  };
}
