<<<<<<< HEAD
'use client';

/**
 * Users data layer. List/detail/create/update use the shared CRUD hooks against the `users`
 * resource. Status and password are module-specific PATCH sub-routes (the backend exposes
 * `/:id/status` and `/:id/password`), called directly through the typed http helpers.
 */

import { adminResource } from '@/constants/api-endpoints';
import { patch } from '@/lib/api/http';
import type { User } from './types';

export const USERS_RESOURCE = 'users';

/** Logical permission key the Users routes require (backend-seeded `users.manage`). */
export const USER_PERMS = { manage: 'users.manage' } as const;

const base = adminResource(USERS_RESOURCE);

/** `PATCH /admin/users/:id/status` — activate / deactivate. */
export const setUserStatus = (id: string, isActive: boolean) =>
  patch<User, { is_active: boolean }>(`${base.detail(id)}/status`, { is_active: isActive });

/** `PATCH /admin/users/:id/password` — Super Admin password reset. */
export const resetUserPassword = (id: string, password: string) =>
  patch<{ id: string }, { password: string }>(`${base.detail(id)}/password`, { password });
=======
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
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
