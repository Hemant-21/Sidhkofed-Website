'use client';

/**
 * Metric create/edit dialog. A metric holds a single backend-authored figure (numeric `value` OR
 * string `value_text`) for a report, optionally scoped to a financial year + reporting period. The
 * editor enters the figure verbatim — the frontend never computes or aggregates a value. Reuses the
 * shared form framework + the FY / Reporting Period pickers. Server-side 422 errors map onto fields.
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Form } from '@/components/form/form';
import { TextField, SelectField } from '@/components/form/fields';
import { FormSection } from '@/components/form/form-section';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/components/form/use-zod-form';
import { useFinancialYearOptions, useReportingPeriodOptions } from '@/components/relationships';
import { useCreateMetric, useUpdateMetric } from '../api';
import { DATASET_SOURCES, DATASET_SOURCE_LABEL, type Metric } from '../types';
import {
  buildMetricPayload,
  emptyMetricForm,
  metricToForm,
  type MetricFormValues,
} from '../metric-form-payload';

const schema = z
  .object({
    metric_key: z.string().trim().min(1, 'Metric key is required.').max(80),
    label_en: z.string().trim().min(1, 'English label is required.').max(150),
    label_hi: z.string().max(150),
    value_kind: z.enum(['number', 'text']),
    value: z.string(),
    value_text: z.string(),
    unit: z.string().max(50),
    financial_year_id: z.string(),
    reporting_period_id: z.string(),
    source: z.enum(DATASET_SOURCES),
    display_order: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.value_kind === 'number') {
      if (v.value.trim() === '' || !Number.isFinite(Number(v.value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: 'Enter a numeric value.',
        });
      }
    } else if (v.value_text.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value_text'],
        message: 'Enter a text value.',
      });
    }
  });

const VALUE_KIND_OPTIONS = [
  { value: 'number', label: 'Numeric value' },
  { value: 'text', label: 'Text value' },
];
const SOURCE_OPTIONS = DATASET_SOURCES.map((s) => ({ value: s, label: DATASET_SOURCE_LABEL[s] }));

export interface MetricDialogProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  metric?: Metric;
}

export function MetricDialog({ open, onClose, reportId, metric }: MetricDialogProps) {
  const isEdit = Boolean(metric);
  const form = useZodForm<MetricFormValues>(schema as never, {
    defaultValues: metric ? metricToForm(metric) : emptyMetricForm(),
  });

  // Reset the form whenever the dialog opens for a different metric (add vs edit).
  useEffect(() => {
    if (open) form.reset(metric ? metricToForm(metric) : emptyMetricForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metric]);

  const valueKind = form.watch('value_kind');
  const financialYears = useFinancialYearOptions();
  const reportingPeriods = useReportingPeriodOptions();

  const createMutation = useCreateMetric(reportId);
  const updateMutation = useUpdateMetric(reportId);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: MetricFormValues) => {
    const payload = buildMetricPayload(values);
    if (isEdit && metric) {
      await updateMutation.mutateAsync({ id: metric.id, body: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit metric' : 'Add metric'}
      description="Enter a backend-authored figure for this report. Values are never computed in the browser."
    >
      <Form form={form} onSubmit={onSubmit} className="space-y-6">
        <FormSection columns={2}>
          <TextField<MetricFormValues>
            name="metric_key"
            label="Metric key"
            required
            placeholder="e.g. total_members"
            disabled={isEdit}
          />
          <SelectField<MetricFormValues> name="source" label="Source" options={SOURCE_OPTIONS} />
          <TextField<MetricFormValues>
            name="label_en"
            label="Label (English)"
            required
            className="sm:col-span-2"
          />
          <TextField<MetricFormValues> name="label_hi" label="लेबल (Hindi)" className="sm:col-span-2" />
        </FormSection>

        <FormSection title="Value" columns={2}>
          <SelectField<MetricFormValues>
            name="value_kind"
            label="Value type"
            options={VALUE_KIND_OPTIONS}
          />
          <TextField<MetricFormValues> name="unit" label="Unit" placeholder="e.g. members, ₹ lakh" />
          {valueKind === 'number' ? (
            <TextField<MetricFormValues> name="value" label="Value" type="number" required />
          ) : (
            <TextField<MetricFormValues> name="value_text" label="Value (text)" required />
          )}
        </FormSection>

        <FormSection title="Reporting scope" columns={2}>
          <SelectField<MetricFormValues>
            name="financial_year_id"
            label="Financial year"
            placeholder="None"
            options={[{ value: '', label: 'None' }, ...financialYears.options]}
          />
          <SelectField<MetricFormValues>
            name="reporting_period_id"
            label="Reporting period"
            placeholder="None"
            options={[{ value: '', label: 'None' }, ...reportingPeriods.options]}
          />
          <TextField<MetricFormValues> name="display_order" label="Display order" type="number" />
        </FormSection>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Save metric' : 'Add metric'}
          </Button>
        </div>
      </Form>
    </Dialog>
  );
}
