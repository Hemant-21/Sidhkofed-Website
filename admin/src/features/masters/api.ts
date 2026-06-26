<<<<<<< HEAD
'use client';

/**
 * Masters data layer. Master data lives behind `/admin/masters/:key` (list/create) and
 * `/admin/masters/:key/:id` (detail/update) plus activate/deactivate sub-routes (API spec §4).
 * Reads are dropdown access for every CMS role; writes/activation are Super Admin only — the
 * backend enforces it and the page gates the affordances via <Can>.
 */

import { MASTERS } from '@/constants/api-endpoints';
import { getList, post, patch } from '@/lib/api/http';
import type { ListQuery } from '@/types/api';
import type { MasterItem, MasterWriteInput } from './types';

export const MASTER_PERMS = {
  view: 'masters.view',
  create: 'masters.create',
  update: 'masters.update',
  activate: 'masters.activate',
  deactivate: 'masters.deactivate',
} as const;

export const listMasters = (key: string, query?: ListQuery) => getList<MasterItem>(MASTERS.admin(key), query);
export const createMaster = (key: string, body: MasterWriteInput) => post<MasterItem, MasterWriteInput>(MASTERS.admin(key), body);
export const updateMaster = (key: string, id: string, body: MasterWriteInput) =>
  patch<MasterItem, MasterWriteInput>(MASTERS.adminItem(key, id), body);
export const activateMaster = (key: string, id: string) => post<MasterItem>(MASTERS.activate(key, id));
export const deactivateMaster = (key: string, id: string) => post<MasterItem>(MASTERS.deactivate(key, id));
=======
/**
 * Masters API functions. All master types share the same generic endpoint pattern
 * `/admin/masters/{key}` (API spec §4). These helpers wrap the shared http utilities
 * so callers never hand-craft URLs.
 */

import { get, getList, post, patch } from '@/lib/api/http';
import { MASTERS } from '@/constants/api-endpoints';
import type { MasterRecord, MasterPayload } from './types';
import type { PaginatedResult } from '@/lib/api/http';
import type { ListQuery } from '@/types/api';

export async function listMasters(
  key: string,
  query?: ListQuery,
): Promise<PaginatedResult<MasterRecord>> {
  return getList<MasterRecord>(MASTERS.admin(key), query);
}

export async function getMaster(key: string, id: string): Promise<MasterRecord> {
  return get<MasterRecord>(MASTERS.adminItem(key, id));
}

export async function createMaster(key: string, body: MasterPayload): Promise<MasterRecord> {
  return post<MasterRecord, MasterPayload>(MASTERS.admin(key), body);
}

export async function updateMaster(
  key: string,
  id: string,
  body: Partial<MasterPayload>,
): Promise<MasterRecord> {
  return patch<MasterRecord, Partial<MasterPayload>>(MASTERS.adminItem(key, id), body);
}

export async function activateMaster(key: string, id: string): Promise<MasterRecord> {
  return post<MasterRecord>(MASTERS.activate(key, id));
}

export async function deactivateMaster(key: string, id: string): Promise<MasterRecord> {
  return post<MasterRecord>(MASTERS.deactivate(key, id));
}
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
