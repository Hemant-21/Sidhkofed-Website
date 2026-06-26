'use client';

/**
 * `useBulkAction` — reusable runner for table bulk actions (publish/archive/restore/
 * delete a selection). It is action-agnostic: the caller supplies a per-id async
 * function (typically a CRUD/lifecycle mutation's `mutateAsync`), and the runner
 * fans out, settles every result, toasts an aggregated summary, and returns the
 * detailed outcome. Permission gating + confirmation are composed at the call site.
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { BulkResult } from '@/types/crud';
import { formatNumber } from '@/utils/format';

export interface UseBulkActionOptions {
  /** Toast an aggregated summary when the run completes. Default true. */
  toastSummary?: boolean;
  /** Verb used in the summary toast, e.g. `Published`, `Archived`. */
  verb?: string;
}

export interface UseBulkActionApi {
  isRunning: boolean;
  /** Run `action` for every id; resolves with the per-id outcome breakdown. */
  run: (ids: string[], action: (id: string) => Promise<unknown>) => Promise<BulkResult>;
}

export function useBulkAction(options: UseBulkActionOptions = {}): UseBulkActionApi {
  const toast = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const verb = options.verb ?? 'Updated';

  const run = useCallback<UseBulkActionApi['run']>(
    async (ids, action) => {
      if (ids.length === 0) return { total: 0, succeeded: [], failed: [] };
      setIsRunning(true);
      try {
        const settled = await Promise.allSettled(ids.map((id) => action(id)));
        const succeeded: string[] = [];
        const failed: BulkResult['failed'] = [];
        settled.forEach((outcome, i) => {
          const id = ids[i] as string;
          if (outcome.status === 'fulfilled') succeeded.push(id);
          else failed.push({ id, error: outcome.reason });
        });

        if (options.toastSummary !== false) {
          if (failed.length === 0) {
            toast.success(`${verb} ${formatNumber(succeeded.length)} record(s).`);
          } else if (succeeded.length === 0) {
            toast.error(`Could not ${verb.toLowerCase()} ${formatNumber(failed.length)} record(s).`);
          } else {
            toast.warning(
              `${verb} ${formatNumber(succeeded.length)}; ${formatNumber(failed.length)} failed.`,
            );
          }
        }

        return { total: ids.length, succeeded, failed };
      } finally {
        setIsRunning(false);
      }
    },
    [options.toastSummary, toast, verb],
  );

  return { isRunning, run };
}
