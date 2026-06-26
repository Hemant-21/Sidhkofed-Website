'use client';

/**
 * Event lifecycle + status actions. Reuses the shared publishing hooks (useLifecycleActions) and
 * the confirmation dialogs; gating is permission/state aware via <Can> (backend still enforces).
 * Lifecycle endpoints: publish/unpublish/archive/restore. Status override: cancel (action) and
 * postpone (PATCH with status_override) — only postponed/cancelled may be set manually (codex §4.1).
 */

import { useState } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { useLifecycleActions, useCrudUpdate } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { EVENTS_RESOURCE, useCancelEvent } from '../api';
import { CONTENT_PERMS, EVENT_ACTION_ROLES } from '../permissions';
import type { EventDetail } from '../types';

export function EventLifecycleActions({ event }: { event: EventDetail }) {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<EventDetail>(EVENTS_RESOURCE);
  const cancelEvent = useCancelEvent();
  const update = useCrudUpdate<{ status_override: boolean; event_status: 'postponed'; revised_start_date: string | null }, EventDetail>(
    EVENTS_RESOURCE,
    { successMessage: 'Event postponed.' },
  );

  const [dialog, setDialog] = useState<null | 'cancel' | 'postpone'>(null);
  const [reason, setReason] = useState('');
  const [revisedDate, setRevisedDate] = useState('');

  const state = event.publication_state;
  const subject = 'this event';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  const submitStatusChange = async () => {
    try {
      if (dialog === 'cancel') {
        await cancelEvent.mutateAsync({
          id: event.id,
          body: { cancellation_reason: reason || null, revised_start_date: revisedDate || null },
        });
      } else if (dialog === 'postpone') {
        await update.mutateAsync({
          id: event.id,
          body: { status_override: true, event_status: 'postponed', revised_start_date: revisedDate || null },
        });
      }
      setDialog(null);
      setReason('');
      setRevisedDate('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const canManageStatus = event.event_status !== 'cancelled';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Can anyOf={[CONTENT_PERMS.update]}>
          <Button asChild variant="outline" size="sm">
            <a href={`${ROUTES.events}/${event.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </a>
          </Button>
        </Can>

        {state !== 'published' ? (
          <Can permission={CONTENT_PERMS.publish}>
            <Button
              size="sm"
              isLoading={publish.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmPublish(subject)) publish.mutate(event.id);
              }}
            >
              Publish
            </Button>
          </Can>
        ) : (
          <Can permission={CONTENT_PERMS.unpublish}>
            <Button
              variant="outline"
              size="sm"
              isLoading={unpublish.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmUnpublish(subject)) unpublish.mutate(event.id);
              }}
            >
              Unpublish
            </Button>
          </Can>
        )}

        {state !== 'archived' ? (
          <Can permission={CONTENT_PERMS.archive}>
            <Button
              variant="outline"
              size="sm"
              isLoading={archive.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmArchive(subject)) archive.mutate(event.id);
              }}
            >
              Archive
            </Button>
          </Can>
        ) : (
          <Can permission={CONTENT_PERMS.restore}>
            <Button
              variant="outline"
              size="sm"
              isLoading={restore.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmRestore(subject)) restore.mutate(event.id);
              }}
            >
              Restore
            </Button>
          </Can>
        )}

        {canManageStatus ? (
          <Can role={EVENT_ACTION_ROLES}>
            <Dropdown
              align="end"
              trigger={
                <Button variant="ghost" size="icon" aria-label="More status actions">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              }
              items={[
                { label: 'Postpone…', onSelect: () => setDialog('postpone') },
                { label: 'Cancel event…', onSelect: () => setDialog('cancel') },
              ]}
            />
          </Can>
        ) : null}
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === 'cancel' ? 'Cancel event' : 'Postpone event'}
        description={
          dialog === 'cancel'
            ? 'The event status becomes Cancelled. The original date is retained.'
            : 'The event status becomes Postponed. Provide a revised date if known.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Close
            </Button>
            <Button
              variant={dialog === 'cancel' ? 'danger' : 'primary'}
              isLoading={cancelEvent.isPending || update.isPending}
              onClick={submitStatusChange}
            >
              {dialog === 'cancel' ? 'Cancel event' : 'Postpone'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {dialog === 'cancel' ? (
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Cancellation reason</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this event cancelled?"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="revised-date">Revised date (optional)</Label>
            <DatePicker id="revised-date" value={revisedDate} onChange={(e) => setRevisedDate(e.target.value)} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
