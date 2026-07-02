'use client';

/**
 * Lifecycle-aware confirmation presets over the DialogProvider. These mirror the
 * CMS lifecycle actions (publish/unpublish/archive/restore/delete) so module pages
 * get consistent, accessible confirmations with one call — no bespoke modals.
 *
 *   const { confirmArchive } = useConfirmDialog();
 *   if (await confirmArchive('this event')) archive.mutate(id);
 */

import { useMemo, type ReactNode } from 'react';
import { useDialog, type ConfirmOptions } from '@/providers/dialog-provider';

export interface ConfirmDialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDelete: (subject?: string, description?: ReactNode) => Promise<boolean>;
  confirmArchive: (subject?: string) => Promise<boolean>;
  confirmRestore: (subject?: string) => Promise<boolean>;
  confirmPublish: (subject?: string) => Promise<boolean>;
  confirmUnpublish: (subject?: string) => Promise<boolean>;
}

export function useConfirmDialog(): ConfirmDialogApi {
  const { confirm } = useDialog();

  return useMemo<ConfirmDialogApi>(
    () => ({
      confirm,
      confirmDelete: (subject = 'this record', description) =>
        confirm({
          title: 'Delete permanently?',
          description:
            description ??
            `Are you sure you want to permanently delete ${subject}? Only unpublished, unlinked drafts can be deleted, and this cannot be undone.`,
          confirmLabel: 'Delete',
          tone: 'danger',
        }),
      confirmArchive: (subject = 'this record') =>
        confirm({
          title: 'Archive?',
          description: `${subject[0]?.toUpperCase()}${subject.slice(1)} will be hidden from public listings. You can restore it later with its original URL.`,
          confirmLabel: 'Archive',
          tone: 'danger',
        }),
      confirmRestore: (subject = 'this record') =>
        confirm({
          title: 'Restore?',
          description: `${subject[0]?.toUpperCase()}${subject.slice(1)} will return to its previous publication state.`,
          confirmLabel: 'Restore',
        }),
      confirmPublish: (subject = 'this record') =>
        confirm({
          title: 'Publish?',
          description: `${subject[0]?.toUpperCase()}${subject.slice(1)} will become publicly visible once required fields are valid.`,
          confirmLabel: 'Publish',
        }),
      confirmUnpublish: (subject = 'this record') =>
        confirm({
          title: 'Unpublish?',
          description: `${subject[0]?.toUpperCase()}${subject.slice(1)} will be removed from public view but kept in the CMS.`,
          confirmLabel: 'Unpublish',
          tone: 'danger',
        }),
    }),
    [confirm],
  );
}
