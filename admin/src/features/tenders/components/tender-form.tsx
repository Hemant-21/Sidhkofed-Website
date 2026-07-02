'use client';

/**
 * Tender create/edit form. Reuses the shared form framework.
 * GeM URL is displayed exactly as provided by backend — never proxied or embedded.
 * External links open with target="_blank" rel="noopener noreferrer".
 * Frontend is INFORMATIONAL only — no bid submission, procurement, or BOQ logic.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SelectField, SwitchField, DateField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMasterOptions } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { TENDERS_RESOURCE } from '../api';
import type { TenderDetail } from '../types';
import {
  buildTenderPayload,
  emptyTenderForm,
  tenderToForm,
  type TenderFormValues,
} from '../tender-form-payload';

const GEM_URL_REGEX = /^https:\/\//;

const schema = z
  .object({
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    tender_type_id: z.string().min(1, 'Tender type is required.'),
    tender_number: z.string().max(100),
    publish_date: z.string(),
    submission_deadline: z.string(),
    opening_date: z.string(),
    tender_status: z.string(),
    summary_en: z.string(),
    summary_hi: z.string(),
    gem_url: z.string().refine(
      (v) => v.trim() === '' || GEM_URL_REGEX.test(v.trim()),
      'GeM URL must start with https://',
    ),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    // Opening date may not precede publish date (API spec §6).
    if (v.publish_date && v.opening_date && v.opening_date < v.publish_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opening_date'],
        message: 'Opening date may not precede the publish date.',
      });
    }
  });

const TENDER_STATUS_OPTIONS = [
  { value: '', label: 'Select status…' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'awarded', label: 'Awarded' },
];

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

export interface TenderFormProps {
  tender?: TenderDetail;
}

export function TenderForm({ tender }: TenderFormProps) {
  const router = useRouter();
  const isEdit = Boolean(tender);

  const form = useZodForm<TenderFormValues>(schema as never, {
    defaultValues: tender ? tenderToForm(tender) : emptyTenderForm(),
  });

  const highlightType = form.watch('highlight_type');
  const tenderTypes = useMasterOptions('tender-types');

  const tenderTypeOptions = [{ value: '', label: 'Select type…' }, ...tenderTypes.options];

  const createMutation = useCrudCreate<ReturnType<typeof buildTenderPayload>, TenderDetail>(
    TENDERS_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildTenderPayload>, TenderDetail>(
    TENDERS_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: TenderFormValues) => {
    const payload = buildTenderPayload(values);
    if (isEdit && tender) {
      const updated = await updateMutation.mutateAsync({ id: tender.id, body: payload });
      router.push(`${ROUTES.tenders}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.tenders}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<TenderFormValues>
          name="title_en"
          label="Title (English)"
          required
          className="sm:col-span-2"
        />
        <SelectField<TenderFormValues>
          name="tender_type_id"
          label="Tender type"
          required
          options={tenderTypeOptions}
        />
        <TextField<TenderFormValues>
          name="tender_number"
          label="Tender number"
          placeholder="e.g. SIDHKOFED/TENDER/2026/01"
        />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <TextareaField<TenderFormValues>
              name="summary_en"
              label="Summary (English)"
              rows={4}
            />
          }
          hindi={
            <>
              <TextField<TenderFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<TenderFormValues>
                name="summary_hi"
                label="सारांश (Hindi)"
                rows={4}
              />
            </>
          }
        />
      </FormSection>

      <FormSection title="Dates" columns={3}>
        <DateField<TenderFormValues> name="publish_date" label="Publish date" />
        <DateField<TenderFormValues> name="submission_deadline" label="Submission deadline" />
        <DateField<TenderFormValues>
          name="opening_date"
          label="Opening date"
          description="Must not precede publish date."
        />
      </FormSection>

      <FormSection title="Status">
        <SelectField<TenderFormValues>
          name="tender_status"
          label="Tender status"
          options={TENDER_STATUS_OPTIONS}
        />
      </FormSection>

      <FormSection
        title="GeM portal link"
        description="Tenders are managed on GeM. The frontend displays this link as-is — it is never proxied or embedded."
      >
        <TextField<TenderFormValues>
          name="gem_url"
          label="GeM URL"
          type="url"
          placeholder="https://gem.gov.in/..."
          description="Must be a valid HTTPS URL. Opens in a new tab."
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<TenderFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<TenderFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<TenderFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<TenderFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<TenderFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<TenderFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<TenderFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && tender ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="tender-slug">Slug (read-only)</Label>
            <Input id="tender-slug" value={tender.slug} readOnly disabled />
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
          {isEdit ? 'Save changes' : 'Create tender'}
        </Button>
      </FormActions>
    </Form>
  );
}
