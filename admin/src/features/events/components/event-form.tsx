'use client';

/**
 * Event create/edit form. Reuses the shared form framework (<Form>, FormField/Field components,
 * BilingualTabs, FormSection), the relationship pickers (master/relation option hooks +
 * CoverMediaField), and the dynamic-field renderer. It NEVER sets publication state (that is the
 * lifecycle actions) and NEVER computes event status. Server-side 422 errors map back onto fields
 * via the <Form> wrapper. The slug is shown read-only after creation (immutable; codex §11).
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import {
  TextField,
  TextareaField,
  SelectField,
  MultiSelectField,
  SwitchField,
  DateField,
} from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CoverMediaField,
  RelationMultiSelectField,
  useMasterOptions,
  type RelationOption,
} from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { useEventFieldDefinitions, EVENTS_RESOURCE } from '../api';
import type { EventDetail } from '../types';
import {
  buildEventPayload,
  emptyEventForm,
  eventToForm,
  type EventFormValues,
} from '../event-form-payload';
import { DynamicFields } from './dynamic-fields';

/** Core client-side schema (the backend remains authoritative; dynamic values pass through). */
const schema = z
  .object({
    event_type_id: z.string().min(1, 'Event type is required.'),
    training_type_id: z.string(),
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    summary_en: z.string(),
    summary_hi: z.string(),
    description_en: z.string(),
    description_hi: z.string(),
    date_mode: z.enum(['single', 'range', 'multi_day']),
    start_date: z.string().min(1, 'Start date is required.'),
    end_date: z.string(),
    location_text: z.string().max(500),
    district_id: z.string(),
    block_id: z.string(),
    cover_media_id: z.string().nullable(),
    commodity_ids: z.array(z.string()),
    programme_ids: z.array(z.string()),
    institution_ids: z.array(z.string()),
    document_ids: z.array(z.string()),
    gallery_ids: z.array(z.string()),
    dynamic_values: z.record(z.unknown()),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    const needsEnd = v.date_mode === 'range' || v.date_mode === 'multi_day';
    if (needsEnd && !v.end_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'End date is required for this date mode.' });
    }
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'Must be on or after the start date.' });
    }
  });

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

const DATE_MODE_OPTIONS = [
  { value: 'single', label: 'Single date' },
  { value: 'range', label: 'Date range' },
  { value: 'multi_day', label: 'Multi-day' },
];

export interface EventFormProps {
  /** Existing event (edit) or undefined (create). */
  event?: EventDetail;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const form = useZodForm<EventFormValues>(schema as never, {
    defaultValues: event ? eventToForm(event) : emptyEventForm(),
  });

  const eventTypeId = form.watch('event_type_id');
  const districtId = form.watch('district_id');
  const dateMode = form.watch('date_mode');
  const highlightType = form.watch('highlight_type');

  // Option sources (reused relationship hooks).
  const eventTypes = useMasterOptions('event-types');
  const trainingTypes = useMasterOptions('training-types');
  const districts = useMasterOptions('districts');
  const blocks = useMasterOptions('blocks', { districtId: districtId || null, enabled: Boolean(districtId) });
  const commodities = useMasterOptions('commodities');

  // Seed each relation picker with the already-linked records' labels (from the detail payload)
  // so existing chips render immediately without re-fetching the matching search page.
  const programmeRefs = useMemo<RelationOption[]>(
    () => (event?.programmes ?? []).map((p) => ({ value: p.id, label: p.title_en })),
    [event],
  );
  const institutionRefs = useMemo<RelationOption[]>(
    () => (event?.institutions ?? []).map((i) => ({ value: i.id, label: i.name_en })),
    [event],
  );
  const galleryRefs = useMemo<RelationOption[]>(
    () => (event?.galleries ?? []).map((g) => ({ value: g.id, label: g.title_en })),
    [event],
  );
  const documentRefs = useMemo<RelationOption[]>(
    () => (event?.documents ?? []).map((d) => ({ value: d.id, label: d.title_en })),
    [event],
  );

  const fieldDefs = useEventFieldDefinitions(eventTypeId || null);

  const createMutation = useCrudCreate<ReturnType<typeof buildEventPayload>, EventDetail>(EVENTS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildEventPayload>, EventDetail>(EVENTS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const needsEnd = dateMode === 'range' || dateMode === 'multi_day';

  const onSubmit = async (values: EventFormValues) => {
    const payload = buildEventPayload(values, fieldDefs.data ?? []);
    if (isEdit && event) {
      const updated = await updateMutation.mutateAsync({ id: event.id, body: payload });
      router.push(`${ROUTES.events}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.events}/${created.id}`);
    }
  };

  const dynamicDefaults = useMemo(() => fieldDefs.data ?? [], [fieldDefs.data]);

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      {/* Classification */}
      <FormSection title="Classification" columns={2}>
        <SelectField<EventFormValues>
          name="event_type_id"
          label="Event type"
          required
          placeholder="Select event type"
          options={eventTypes.options}
        />
        <SelectField<EventFormValues>
          name="training_type_id"
          label="Training type"
          placeholder="Not applicable"
          options={[{ value: '', label: 'None' }, ...trainingTypes.options]}
        />
      </FormSection>

      {/* Bilingual content */}
      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextField<EventFormValues> name="title_en" label="Title (English)" required />
              <TextareaField<EventFormValues> name="summary_en" label="Summary (English)" rows={2} />
              <TextareaField<EventFormValues> name="description_en" label="Description (English)" rows={6} />
            </>
          }
          hindi={
            <>
              <TextField<EventFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<EventFormValues> name="summary_hi" label="सारांश (Hindi)" rows={2} />
              <TextareaField<EventFormValues> name="description_hi" label="विवरण (Hindi)" rows={6} />
            </>
          }
        />
      </FormSection>

      {/* Schedule + location */}
      <FormSection title="Schedule & location" columns={2}>
        <SelectField<EventFormValues> name="date_mode" label="Date mode" required options={DATE_MODE_OPTIONS} />
        <div className="hidden sm:block" aria-hidden="true" />
        <DateField<EventFormValues> name="start_date" label="Start date" required />
        {needsEnd ? <DateField<EventFormValues> name="end_date" label="End date" required /> : <div aria-hidden="true" />}
        <SelectField<EventFormValues>
          name="district_id"
          label="District"
          placeholder="Select district"
          options={[{ value: '', label: 'None' }, ...districts.options]}
        />
        <SelectField<EventFormValues>
          name="block_id"
          label="Block"
          placeholder={districtId ? 'Select block' : 'Select a district first'}
          disabled={!districtId}
          options={[{ value: '', label: 'None' }, ...blocks.options]}
        />
        <TextField<EventFormValues> name="location_text" label="Location" className="sm:col-span-2" />
      </FormSection>

      {/* Type-specific (dynamic) fields */}
      <DynamicFields
        definitions={dynamicDefaults}
        isLoading={fieldDefs.isLoading}
        awaitingType={!eventTypeId}
      />

      {/* Relationships */}
      <FormSection title="Relationships" description="Linked master data and reusable records." columns={2}>
        <MultiSelectField<EventFormValues> name="commodity_ids" label="Commodities" options={commodities.options} />
        <RelationMultiSelectField<EventFormValues>
          name="programme_ids"
          resource="programmes"
          label="Programmes & schemes"
          placeholder="Link programmes…"
          searchPlaceholder="Search programmes…"
          initialOptions={programmeRefs}
        />
        <RelationMultiSelectField<EventFormValues>
          name="institution_ids"
          resource="institutions"
          label="Institutions"
          placeholder="Link institutions…"
          searchPlaceholder="Search institutions…"
          initialOptions={institutionRefs}
        />
        <RelationMultiSelectField<EventFormValues>
          name="gallery_ids"
          resource="galleries"
          label="Galleries"
          placeholder="Link galleries…"
          searchPlaceholder="Search galleries…"
          initialOptions={galleryRefs}
        />
        <RelationMultiSelectField<EventFormValues>
          name="document_ids"
          resource="documents"
          label="Documents"
          placeholder="Link documents…"
          searchPlaceholder="Search documents…"
          initialOptions={documentRefs}
        />
      </FormSection>

      {/* Media */}
      <FormSection title="Cover image">
        <CoverMediaField<EventFormValues>
          name="cover_media_id"
          label="Cover image"
          description="Used as the social/share image and listing thumbnail."
          initialMedia={event?.cover_media ? { id: event.cover_media.id, url: event.cover_media.url, alt_text: event.cover_media.alt_text } : null}
        />
      </FormSection>

      {/* Visibility + scheduling + highlight */}
      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<EventFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<EventFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<EventFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<EventFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<EventFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4">
            <DateField<EventFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<EventFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}
      </FormSection>

      {isEdit && event ? (
        <FormSection title="Identifiers">
          <div>
            <Label htmlFor="event-slug">Slug (read-only)</Label>
            <Input id="event-slug" value={event.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              The public URL is permanent and cannot be changed after creation.
            </p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create event'}
        </Button>
      </FormActions>
    </Form>
  );
}
