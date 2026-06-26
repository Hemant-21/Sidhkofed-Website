'use client';

/**
 * Profile React Query hooks. The profile data is sourced directly from the auth context
 * (GET /auth/me is already called on boot by the AuthProvider). These hooks add mutation
 * support (PATCH /admin/users/:id) and sync the auth context on success so the topbar
 * avatar/name updates immediately.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { updateProfile, changePassword } from './api';
import type { ChangePasswordPayload, UpdateProfilePayload } from './types';

/** Mutate the user's name / preferred_language. Syncs the auth context on success. */
export function useUpdateProfile() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => {
      if (!user) throw new Error('Not authenticated.');
      return updateProfile(user.id, payload);
    },
    onSuccess: async () => {
      // Re-read /auth/me so the auth context reflects the new name / language.
      await refreshUser();
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Profile updated.');
    },
    onError: () => {
      toast.error('Failed to update profile. Please try again.');
    },
  });
}

/** Mutate the user's password. No auth context sync needed (token unchanged). */
export function useChangePassword() {
  const { user } = useAuth();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => {
      if (!user) throw new Error('Not authenticated.');
      return changePassword(user.id, payload);
    },
    onSuccess: () => {
      toast.success('Password changed successfully.');
    },
    onError: () => {
      toast.error('Failed to change password. Ensure your new password meets the requirements.');
    },
  });
}
