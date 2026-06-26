'use client';

/**
 * Procurement Update create/edit form. NEVER calculates rates, totals, or performs any
 * procurement logic — those are ERP concerns (codex §4.8 / non-goals). The frontend passes
 * rate and unit as plain strings entered by the user; all computation stays on the backend.
 *
 * Conditional fields (rate/unit, dates, location) are all shown but optional, matching the
 * backend's nullable schema. Block options are pre-filtered when district is selected.
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
import { useMasterOptions, RelationPicker, type RelationOption } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { PROCUREMENT_RESOURCE } from '../api';
import type { ProcurementDetail } from '../types';
import {
  buildProcurementPayload,
  emptyProcurementForm,
  procurementToForm,
  type ProcurementFormValues,
} from '../procurement-form-payload';

const schema = z
  .object({
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    procurement_update_type_id: z.string().min(1, 'Update type is required.'),
    commodity_id: z.string().nullable(),
    programme_scheme_id: z.string().nullable(),
    district_id: z.string().nullable(),
    block_id: z.string().nullable(),
    location_text: z.string().max(255),
    rate: z.string().max(50),
    unit: z.string().max(50),
    effective_date: z.string(),
    period_start: z.string(),
    period_end: z.string(),
    short_description_en: z.string(),
    short_description_hi: z.string(),
    status: z.string(),
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
    // Mirror backend: period end cannot precede start (API spec §6).
    if (v.period_start && v.period_end && v.period_end < v.period_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['period_end'],
        message: 'Must be on or after the period start date.',
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

const STATUS_OPTIONS = [
  { value: '', label: 'Select status…' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'upcoming', label: 'Upcoming' },
];

export interface ProcurementFormProps {
  procurement?: ProcurementDetail;
}

export function ProcurementForm({ procurement }: ProcurementFormProps) {
  const router = useRouter();
  const isEdit = Boolean(procurement);

  const form = useZodForm<ProcurementFormValues>(schema as never, {
    defaultValues: procurement ? procurementToForm(procurement) : emptyProcurementForm(),
  });

  const highlightType = form.watch('highlight_type');
  const procTypes = useMasterOptions('procurement-update-types');
  const procTypeOptions = [{ value: '', label: 'Select update type…' }, ...procTypes.options];

  const commodityInitial = useMemo<RelationOption[]>(
    () =>
      procurement?.commodity
        ? [{ value: procurement.commodity.id, label: procurement.commodity.name_en }]
        : [],
    [procurement],
  );
  const programmeInitial = useMemo<RelationOption[]>(
    () =>
      procurement?.programme
        ? [{ value: procurement.programme.id, label: procurement.programme.name_en }]
        : [],
    [procurement],
  );
  const districtInitial = useMemo<RelationOption[]>(
    () =>
      procurement?.district
        ? [{ value: procurement.district.id, label: procurement.district.name_en }]
        : [],
    [procurement],
  );
  const blockInitial = useMemo<RelationOption[]>(
    () =>
      procurement?.block
        ? [{ value: procurement.block.id, label: procurement.block.name_en }]
        : [],
    [procurement],
  );
  const documentInitial = useMemo<RelationOption[]>(
    () =>
      procurement?.document
        ? [{ value: procurement.document.id, label: procurement.document.title_en }]
        : [],
    [procurement],
  );

  const createMutation = useCrudCreate<ReturnType<typeof buildProcurementPayload>, ProcurementDetail>(
    PROCUREMENT_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildProcurementPayload>, ProcurementDetail>(
    PROCUREMENT_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ProcurementFormValues) => {
    const payload = buildProcurementPayload(values);
    if (isEdit && procurement) {
      const updated = await updateMutation.mutateAsync({ id: procurement.id, body: payload });
      router.push(`${ROUTES.procurement}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.procurement}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<ProcurementFormValues>
          name="title_en"
          label="Title (English)"
          required
          className="sm:col-span-2"
        />
        <SelectField<ProcurementFormValues>
          name="procurement_update_type_id"
          label="Update type"
          required
          options={procTypeOptions}
        />
        <SelectField<ProcurementFormValues>
          name="status"
          label="Status (informational)"
          options={STATUS_OPTIONS}
        />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <TextareaField<ProcurementFormValues>
              name="short_description_en"
              label="Description (English)"
              rows={4}
            />
          }
          hindi={
            <>
              <TextField<ProcurementFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<ProcurementFormValues>
                name="short_description_hi"
                label="विवरण (Hindi)"
                rows={4}
              />
            </>
          }
        />
      </FormSection>

      <FormSection
        title="Rate & unit"
        description="Rate and unit are informational display values only. No calculation is performed here."
        columns={2}
      >
        <TextField<ProcurementFormValues>
          name="rate"
          label="Rate"
          placeholder="e.g. 250.00"
          description="Displayed as-is — frontend performs no calculation."
        />
        <TextField<ProcurementFormValues>
          name="unit"
          label="Unit"
          placeholder="e.g. per kg, per MT"
        />
      </FormSection>

      <FormSection title="Dates" columns={3}>
        <DateField<ProcurementFormValues> name="effective_date" label="Effective date" />
        <DateField<ProcurementFormValues> name="period_start" label="Period start" />
        <DateField<ProcurementFormValues>
          name="period_end"
          label="Period end"
          description="Must not precede period start."
        />
      </FormSection>

      <FormSection title="Relationships" columns={2}>
        <FormField<ProcurementFormValues>
          name="commodity_id"
          label="Commodity"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="commodities"
              multiple={false}
              value={field.value ? [field.value] : []}
              onChange={(v) => field.onChange(v[0] ?? null)}
              initialOptions={commodityInitial}
              placeholder="Link a commodity…"
              searchPlaceholder="Search commodities…"
              invalid={invalid}
            />
          )}
        />
        <FormField<ProcurementFormValues>
          name="programme_scheme_id"
          label="Programme / scheme"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="programmes"
              multiple={false}
              value={field.value ? [field.value] : []}
              onChange={(v) => field.onChange(v[0] ?? null)}
              initialOptions={programmeInitial}
              placeholder="Link a programme…"
              searchPlaceholder="Search programmes…"
              invalid={invalid}
            />
          )}
        />
        <FormField<ProcurementFormValues>
          name="district_id"
          label="District"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="districts"
              multiple={false}
              value={field.value ? [field.value] : []}
              onChange={(v) => field.onChange(v[0] ?? null)}
              initialOptions={districtInitial}
              placeholder="Link a district…"
              searchPlaceholder="Search districts…"
              invalid={invalid}
            />
          )}
        />
        <FormField<ProcurementFormValues>
          name="block_id"
          label="Block"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="blocks"
              multiple={false}
              value={field.value ? [field.value] : []}
              onChange={(v) => field.onChange(v[0] ?? null)}
              initialOptions={blockInitial}
              placeholder="Link a block…"
              searchPlaceholder="Search blocks…"
              invalid={invalid}
            />
          )}
        />
        <TextField<ProcurementFormValues>
          name="location_text"
          label="Location text"
          placeholder="e.g. Gumla Procurement Centre"
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Linked document" description="Optionally attach a document from the Document Centre.">
        <FormField<ProcurementFormValues>
          name="document_id"
          label="Linked document"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="documents"
              multiple={false}
              value={field.value ? [field.value] : []}
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
        <SwitchField<ProcurementFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<ProcurementFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<ProcurementFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<ProcurementFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<ProcurementFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<ProcurementFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<ProcurementFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && procurement ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="proc-slug">Slug (read-only)</Label>
            <Input id="proc-slug" value={procurement.slug} readOnly disabled />
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
          {isEdit ? 'Save changes' : 'Create procurement update'}
        </Button>
      </FormActions>
    </Form>
  );
}
