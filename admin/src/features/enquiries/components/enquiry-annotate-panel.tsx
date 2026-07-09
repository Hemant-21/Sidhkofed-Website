'use client';

/**
 * Enquiry annotate panel — the ONLY editable surface on an enquiry (enquiries.validators.ts →
 * enquiryAdminPatchSchema accepts just `internal_notes` + `spam_state`; public contact fields are
 * immutable from the admin side). Dirty-tracked against the persisted detail, same pattern as
 * `<SettingEditor>` (features/settings): the Save button only appears once the draft differs.
 */
import { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCrudUpdate } from '@/hooks/crud';
import { ENQUIRIES_RESOURCE } from '../api';
import { SPAM_STATES, SPAM_STATE_LABEL, type EnquiryAnnotateInput, type EnquiryDetail, type SpamState } from '../types';

const SPAM_STATE_OPTIONS = SPAM_STATES.map((s) => ({ value: s, label: SPAM_STATE_LABEL[s] }));

export function EnquiryAnnotatePanel({ enquiry }: { enquiry: EnquiryDetail }) {
  const [notes, setNotes] = useState(enquiry.internal_notes ?? '');
  const [spamState, setSpamState] = useState<SpamState>(enquiry.spam_state);

  useEffect(() => {
    setNotes(enquiry.internal_notes ?? '');
    setSpamState(enquiry.spam_state);
  }, [enquiry.internal_notes, enquiry.spam_state]);

  const update = useCrudUpdate<EnquiryAnnotateInput, EnquiryDetail>(ENQUIRIES_RESOURCE, {
    successMessage: 'Enquiry annotation saved.',
    toastOnError: true,
  });

  const isDirty = notes !== (enquiry.internal_notes ?? '') || spamState !== enquiry.spam_state;

  const reset = () => {
    setNotes(enquiry.internal_notes ?? '');
    setSpamState(enquiry.spam_state);
  };

  const save = () => {
    update.mutate({
      id: enquiry.id,
      body: { internal_notes: notes.trim() === '' ? null : notes, spam_state: spamState },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="enquiry-spam-state">Spam state</Label>
        <Select
          id="enquiry-spam-state"
          value={spamState}
          onChange={(e) => setSpamState(e.target.value as SpamState)}
          options={SPAM_STATE_OPTIONS}
          className="max-w-xs"
          disabled={update.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enquiry-internal-notes">Internal notes</Label>
        <Textarea
          id="enquiry-internal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Notes for other Publishers/Super Admins (not visible to the public)."
          disabled={update.isPending}
        />
      </div>

      {isDirty ? (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} isLoading={update.isPending}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={update.isPending}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}
