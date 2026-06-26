'use client';

/**
 * Dashboard report DEFINITION form (Super Admin only — gated by the page). Reuses the shared form
 * framework. On create, `report_key` is chosen from the FIXED report catalog (no arbitrary keys);
 * on edit it is read-only (immutable, code-referenced identity). `layout_config` is an optional
 * bounded JSON object (a fixed presentation descriptor, never a builder). It NEVER sets publication
 * state (lifecycle actions do). Server-side 422 errors map back onto fields via the <Form> wrapper.
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
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { REPORTS_RESOURCE } from '../api';
import { FIXED_REPORTS, type ReportDetail } from '../types';
import {
  buildReportPayload,
  emptyReportForm,
  parseLayoutConfig,
  reportToForm,
  type ReportFormValues,
} from '../report-form-payload';

const schema = z
  .object({
    report_key: z.string(),
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    description_en: z.string(),
    description_hi: z.string(),
    layout_config: z.string(),
    is_active: z.boolean(),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    if (parseLayoutConfig(v.layout_config) === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['layout_config'],
        message: 'Must be a valid JSON object (or left empty).',
      });
    }
  });

const KEY_OPTIONS = [
  { value: '', label: 'Select report…' },
  ...FIXED_REPORTS.map((r) => ({ value: r.key, label: `${r.title} (${r.key})` })),
];

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

export interface ReportFormProps {
  report?: ReportDetail;
}

export function ReportForm({ report }: ReportFormProps) {
  const router = useRouter();
  const isEdit = Boolean(report);

  const form = useZodForm<ReportFormValues>(schema as never, {
    defaultValues: report ? reportToForm(report) : emptyReportForm(),
  });

  const highlightType = form.watch('highlight_type');

  const createMutation = useCrudCreate<ReturnType<typeof buildReportPayload>, ReportDetail>(
    REPORTS_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildReportPayload>, ReportDetail>(
    REPORTS_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ReportFormValues) => {
    if (!isEdit && values.report_key.trim() === '') {
      form.setError('report_key', { message: 'Report key is required.' });
      return;
    }
    const payload = buildReportPayload(values, isEdit);
    if (isEdit && report) {
      const updated = await updateMutation.mutateAsync({ id: report.id, body: payload });
      router.push(`${ROUTES.dashboardReports}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.dashboardReports}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        {isEdit && report ? (
          <div>
            <Label htmlFor="report-key">Report key (read-only)</Label>
            <Input id="report-key" value={report.report_key} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              Report keys are fixed and cannot be changed after creation.
            </p>
          </div>
        ) : (
          <SelectField<ReportFormValues>
            name="report_key"
            label="Report"
            required
            options={KEY_OPTIONS}
            description="One of the fixed dashboard reports (codex §13)."
          />
        )}
        <TextField<ReportFormValues> name="title_en" label="Title (English)" required />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextareaField<ReportFormValues>
                name="description_en"
                label="Description (English)"
                rows={3}
              />
            </>
          }
          hindi={
            <>
              <TextField<ReportFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<ReportFormValues>
                name="description_hi"
                label="विवरण (Hindi)"
                rows={3}
              />
            </>
          }
        />
      </FormSection>

      <FormSection
        title="Layout"
        description="A fixed presentation descriptor (JSON object). Leave empty to use the report's default layout. This is not a report builder."
      >
        <TextareaField<ReportFormValues>
          name="layout_config"
          label="Layout config (JSON)"
          rows={6}
          placeholder='{ "charts": ["bar"] }'
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<ReportFormValues> name="is_active" label="Active" />
        <SwitchField<ReportFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<ReportFormValues> name="show_on_homepage" label="Show on homepage (KPI)" />
        <DateField<ReportFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<ReportFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<ReportFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<ReportFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<ReportFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create report'}
        </Button>
      </FormActions>
    </Form>
  );
}
