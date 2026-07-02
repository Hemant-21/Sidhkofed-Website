'use client';

/**
 * Event completion panel. When the backend marks an event `completed`, post-event outcome fields
 * become editable (codex §4.1) and the event may be published as news. Completion is performed via
 * POST /admin/events/{id}/complete (useCompleteEvent) — the frontend never derives completion.
 * Outcome display is read-only; editing/marking-completed is role-gated (Super Admin + Publisher).
 */

import { useState } from 'react';
import { z } from 'zod';
import { CheckCircle2, Newspaper } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, DateField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Can } from '@/components/auth';
import { formatDate } from '@/utils/date';
import { useCompleteEvent } from '../api';
import { CONTENT_PERMS, EVENT_ACTION_ROLES } from '../permissions';
import type { EventDetail, EventCompleteInput } from '../types';
import { PublishAsNewsDialog } from './publish-as-news-dialog';

const schema = z.object({
  outcome_summary_en: z.string(),
  outcome_summary_hi: z.string(),
  key_highlights: z.string(),
  final_participant_count: z.string(),
  participant_male_count: z.string(),
  participant_female_count: z.string(),
  participant_other_count: z.string(),
  completion_remarks_en: z.string(),
  completion_remarks_hi: z.string(),
  completed_date: z.string(),
});

type FormValues = z.infer<typeof schema>;

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));
const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function EventCompletionPanel({ event }: { event: EventDetail }) {
  const [formOpen, setFormOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const complete = useCompleteEvent();
  const isCompleted = event.event_status === 'completed';
  const alreadyNews = event.news.length > 0;

  const form = useZodForm<FormValues>(schema as never, {
    defaultValues: {
      outcome_summary_en: event.outcome_summary_en ?? '',
      outcome_summary_hi: event.outcome_summary_hi ?? '',
      key_highlights: event.key_highlights ?? '',
      final_participant_count: event.final_participant_count != null ? String(event.final_participant_count) : '',
      participant_male_count: event.participant_male_count != null ? String(event.participant_male_count) : '',
      participant_female_count: event.participant_female_count != null ? String(event.participant_female_count) : '',
      participant_other_count: event.participant_other_count != null ? String(event.participant_other_count) : '',
      completion_remarks_en: event.completion_remarks_en ?? '',
      completion_remarks_hi: event.completion_remarks_hi ?? '',
      completed_date: event.completed_date ?? '',
    },
  });

  const onSubmit = async (v: FormValues) => {
    const body: EventCompleteInput = {
      outcome_summary_en: blank(v.outcome_summary_en),
      outcome_summary_hi: blank(v.outcome_summary_hi),
      key_highlights: blank(v.key_highlights),
      final_participant_count: numOrNull(v.final_participant_count),
      participant_male_count: numOrNull(v.participant_male_count),
      participant_female_count: numOrNull(v.participant_female_count),
      participant_other_count: numOrNull(v.participant_other_count),
      completion_remarks_en: blank(v.completion_remarks_en),
      completion_remarks_hi: blank(v.completion_remarks_hi),
      completed_date: blank(v.completed_date),
    };
    await complete.mutateAsync({ id: event.id, body });
    setFormOpen(false);
  };

  return (
    <Card>
      <CardHeader
        title="Outcome & completion"
        description={isCompleted ? 'Post-event details for this completed event.' : 'Available once the event is completed.'}
        actions={
          <Can role={EVENT_ACTION_ROLES}>
            <div className="flex gap-2">
              {isCompleted && !alreadyNews ? (
                <Can permission={CONTENT_PERMS.publish}>
                  <Button size="sm" variant="outline" onClick={() => setNewsOpen(true)} leftIcon={<Newspaper className="h-4 w-4" />}>
                    Publish as news
                  </Button>
                </Can>
              ) : null}
              <Button size="sm" variant={isCompleted ? 'outline' : 'primary'} onClick={() => setFormOpen(true)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                {isCompleted ? 'Edit completion' : 'Mark completed'}
              </Button>
            </div>
          </Can>
        }
      />
      <CardContent>
        {isCompleted ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Completed date" value={formatDate(event.completed_date)} />
            <Field label="Final participants" value={event.final_participant_count != null ? String(event.final_participant_count) : '—'} />
            <Field label="Outcome summary" value={event.outcome_summary_en ?? '—'} full />
            <Field label="Key highlights" value={event.key_highlights ?? '—'} full />
            {alreadyNews ? (
              <Field
                label="News"
                full
                value={`Published as news (${event.news.length} record${event.news.length > 1 ? 's' : ''}).`}
              />
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            This event is <strong>{event.event_status}</strong>. Outcome fields and publishing as news
            become available when it is completed.
          </p>
        )}
      </CardContent>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={isCompleted ? 'Edit completion details' : 'Mark event completed'} size="lg">
        <Form form={form} onSubmit={onSubmit} className="space-y-6">
          <BilingualTabs
            english={
              <>
                <TextareaField<FormValues> name="outcome_summary_en" label="Outcome summary (English)" rows={3} />
                <TextareaField<FormValues> name="completion_remarks_en" label="Remarks (English)" rows={2} />
              </>
            }
            hindi={
              <>
                <TextareaField<FormValues> name="outcome_summary_hi" label="परिणाम सारांश (Hindi)" rows={3} />
                <TextareaField<FormValues> name="completion_remarks_hi" label="टिप्पणी (Hindi)" rows={2} />
              </>
            }
          />
          <TextareaField<FormValues> name="key_highlights" label="Key highlights" rows={2} />
          <FormSection title="Participants" columns={2}>
            <DateField<FormValues> name="completed_date" label="Completed date" />
            <TextField<FormValues> name="final_participant_count" label="Final participant count" type="number" />
            <TextField<FormValues> name="participant_male_count" label="Male" type="number" />
            <TextField<FormValues> name="participant_female_count" label="Female" type="number" />
            <TextField<FormValues> name="participant_other_count" label="Other" type="number" />
          </FormSection>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={complete.isPending}>
              {isCompleted ? 'Save completion' : 'Mark completed'}
            </Button>
          </FormActions>
        </Form>
      </Dialog>

      <PublishAsNewsDialog event={event} open={newsOpen} onClose={() => setNewsOpen(false)} />
    </Card>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value}</dd>
    </div>
  );
}
