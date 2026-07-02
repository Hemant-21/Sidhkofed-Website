'use client';

/**
 * Institutional Membership data layer. Standard list/detail/create/update/lifecycle use the shared
 * CRUD hooks against the `memberships` resource — no bespoke fetch logic. This module adds the one
 * membership-SPECIFIC sub-route that is not part of the generic "P" pattern: the transactional
 * bulk-upload (`POST /admin/memberships/bulk-upload`).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminResource } from '@/constants/api-endpoints';
import { get, post } from '@/lib/api/http';
import { invalidateResource } from '@/lib/query';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import type { MembershipDetail, MembershipBulkRow, MembershipBulkUploadResult } from './types';

export const MEMBERSHIPS_RESOURCE = 'memberships';

export { MEMBERSHIP_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchMembership = (id: string) =>
  get<MembershipDetail>(adminResource(MEMBERSHIPS_RESOURCE).detail(id));

const bulkUploadPath = `${adminResource(MEMBERSHIPS_RESOURCE).list}/bulk-upload`;

/**
 * Validate-then-create a batch of memberships in ONE backend transaction
 * (`POST /admin/memberships/bulk-upload`). The backend validates every row, skips invalid ones, and
 * returns row-level errors so the client can correct and retry — no business logic runs here. On
 * success the resource lists are invalidated.
 */
export function useMembershipBulkUpload() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (rows: MembershipBulkRow[]) =>
      post<MembershipBulkUploadResult, { rows: MembershipBulkRow[] }>(bulkUploadPath, { rows }),
    onSuccess: (result) => {
      void invalidateResource(queryClient, MEMBERSHIPS_RESOURCE);
      if (result.created_count > 0) {
        toast.success(
          `Imported ${result.created_count} membership(s)` +
            (result.skipped_count > 0 ? `, skipped ${result.skipped_count}.` : '.'),
        );
      } else if (result.skipped_count > 0) {
        toast.warning(`No rows imported — ${result.skipped_count} skipped. Fix the errors and retry.`);
      }
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
