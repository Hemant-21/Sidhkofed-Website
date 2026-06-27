/**
 * User Management API client (`GET|POST /admin/users`, `GET|PATCH /admin/users/{id}`).
 * API spec §6: Super Admin only. No delete endpoint — deactivate instead.
 */

import { get, getList, patch, post } from '@/lib/api/http';
import type { ListQuery } from '@/types/api';
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from './types';

const BASE = '/admin/users';

export async function fetchUsers(query?: ListQuery) {
  return getList<AdminUser>(BASE, query);
}

export async function fetchUser(id: string): Promise<AdminUser> {
  return get<AdminUser>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  return post<AdminUser, CreateUserPayload>(BASE, payload);
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
  return patch<AdminUser, UpdateUserPayload>(`${BASE}/${encodeURIComponent(id)}`, payload);
}
