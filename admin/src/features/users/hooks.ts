'use client';

/**
 * User Management React Query hooks. All endpoints are Super Admin only (API spec §8);
 * callers must gate with `enabled` to avoid unnecessary 403s for other roles.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { ListQuery } from '@/types/api';
import { createUser, fetchUser, fetchUsers, updateUser } from './api';
import type { CreateUserPayload, UpdateUserPayload } from './types';

const USERS_KEY = ['admin', 'users'];

export function useUserList(query: ListQuery, enabled = true) {
  return useQuery({
    queryKey: [...USERS_KEY, query],
    queryFn: () => fetchUsers(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useUserDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: () => fetchUser(id!),
    enabled: enabled && Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('User created successfully.');
    },
    onError: () => {
      toast.error('Failed to create user. Check the form for errors.');
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('User updated successfully.');
    },
    onError: () => {
      toast.error('Failed to update user. Check the form for errors.');
    },
  });
}
