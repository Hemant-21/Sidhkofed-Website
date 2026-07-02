'use client';

/**
 * Official Communication create/edit form. Reuses the shared form framework, bilingual tabs,
 * master-option hooks (communication-types), and the server-side document relation picker.
 * Never sets publication state (lifecycle actions handle that). Server-side 422 errors map back
 * onto fields via the <Form> wrapper. Slug is shown read-only after creation.
 *
 * Expiry date is INFORMATIONAL — it never automatically unpublishes content (codex §4.6 / §8).
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SelectField, SwitchField, DateField } from '@/components/form/fields';
import { FormField } from '@/components/form/form-field';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMasterOptions, RelationPicker, toRelationValue, type RelationOption } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { COMMUNICATIONS_RESOURCE } from '../api';
import type { CommunicationDetail } from '../types';
import {
  buildCommunicationPayload,
  emptyCommunicationForm,
  communicationToForm,
  type CommunicationFormValues,
} from '../communication-form-payload';

const schema = z
  .object({
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    communication_type_id: z.string().min(1, 'Communication type is required.'),
    reference_number: z.string().max(100),
    issue_date: z.string(),
    effective_date: z.string(),
    expiry_date: z.string(),
    issuing_authority: z.string().max(255),
    summary_en: z.string(),
    summary_hi: z.string(),
    body_en: z.string(),
    body_hi: z.string(),
    document_id: z.string().nullable(),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    // Mirror backend: effective cannot precede issue; expiry cannot precede effective/issue.
    if (v.issue_date && v.effective_date && v.effective_date < v.issue_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effective_date'],
        message: 'Must be on or after the issue date.',
      });
    }
    if (v.issue_date && v.expiry_date && v.expiry_date < v.issue_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiry_date'],
        message: 'Must be on or after the issue date.',
      });
    }
  });

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

export interface CommunicationFormProps {
  communication?: CommunicationDetail;
}

export function CommunicationForm({ communication }: CommunicationFormProps) {
  const router = useRouter();
  const isEdit = Boolean(communication);

  const form = useZodForm<CommunicationFormValues>(schema as never, {
    defaultValues: communication ? communicationToForm(communication) : emptyCommunicationForm(),
  });

  const highlightType = form.watch('highlight_type');
  const commTypes = useMasterOptions('communication-types');

  const commTypeOptions = [
    { value: '', label: 'Select type…' },
    ...commTypes.options,
  ];

  const documentInitial = useMemo<RelationOption[]>(
    () =>
      communication?.document
        ? [{ value: communication.document.id, label: communication.document.title_en }]
        : [],
    [communication],
  );

  const createMutation = useCrudCreate<ReturnType<typeof buildCommunicationPayload>, CommunicationDetail>(
    COMMUNICATIONS_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildCommunicationPayload>, CommunicationDetail>(
    COMMUNICATIONS_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: CommunicationFormValues) => {
    const payload = buildCommunicationPayload(values);
    if (isEdit && communication) {
      const updated = await updateMutation.mutateAsync({ id: communication.id, body: payload });
      router.push(`${ROUTES.communications}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.communications}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<CommunicationFormValues>
          name="title_en"
          label="Title (English)"
          required
          className="sm:col-span-2"
        />
        <SelectField<CommunicationFormValues>
          name="communication_type_id"
          label="Communication type"
          required
          options={commTypeOptions}
        />
        <TextField<CommunicationFormValues>
          name="reference_number"
          label="Reference number"
          placeholder="e.g. SIDHKOFED/2026/01"
        />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextareaField<CommunicationFormValues>
                name="summary_en"
                label="Summary (English)"
                rows={2}
              />
              <TextareaField<CommunicationFormValues>
                name="body_en"
                label="Body (English)"
                rows={6}
              />
            </>
          }
          hindi={
            <>
              <TextField<CommunicationFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<CommunicationFormValues>
                name="summary_hi"
                label="सारांश (Hindi)"
                rows={2}
              />
              <TextareaField<CommunicationFormValues>
                name="body_hi"
                label="विवरण (Hindi)"
                rows={6}
              />
            </>
          }
        />
      </FormSection>

      <FormSection title="Dates" columns={3}>
        <DateField<CommunicationFormValues> name="issue_date" label="Issue date" />
        <DateField<CommunicationFormValues> name="effective_date" label="Effective date" />
        <DateField<CommunicationFormValues>
          name="expiry_date"
          label="Expiry date"
          description="Informational only — does not automatically unpublish."
        />
        <TextField<CommunicationFormValues>
          name="issuing_authority"
          label="Issuing authority"
          className="sm:col-span-3"
          placeholder="e.g. Managing Director, SIDHKOFED"
        />
      </FormSection>

      <FormSection title="Linked document" description="Optionally attach a document from the Document Centre.">
        <FormField<CommunicationFormValues>
          name="document_id"
          label="Linked document"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="documents"
              multiple={false}
              value={toRelationValue(field.value)}
              onChange={(v) => field.onChange(v[0] ?? null)}
              initialOptions={documentInitial}
              placeholder="Search documents…"
              searchPlaceholder="Search documents…"
              invalid={invalid}
            />
          )}
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<CommunicationFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<CommunicationFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<CommunicationFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<CommunicationFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<CommunicationFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<CommunicationFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<CommunicationFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && communication ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="comm-slug">Slug (read-only)</Label>
            <Input id="comm-slug" value={communication.slug} readOnly disabled />
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
          {isEdit ? 'Save changes' : 'Create communication'}
        </Button>
      </FormActions>
    </Form>
  );
}
