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
