'use client';

import { useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Form } from '@/components/form/form';
import { TextField, DateField } from '@/components/form/fields';
import { FormSection } from '@/components/form/form-section';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/components/form/use-zod-form';
import { useCreateMaster, useUpdateMaster } from '../hooks';
import type { MasterRecord, MasterPayload, MasterTypeConfig } from '../types';
import {
  defaultMasterSchema,
  type DefaultMasterValues,
  buildDefaultMasterPayload,
  financialYearSchema,
  type FinancialYearValues,
  buildFinancialYearPayload,
} from '../master-form-payload';

// ── Default form (name_en / name_hi / display_order) ─────────────────────────

function DefaultMasterForm({
  config,
  record,
  onClose,
}: {
  config: MasterTypeConfig;
  record?: MasterRecord;
  onClose: () => void;
}) {
  const isEdit = Boolean(record);
  const form = useZodForm<DefaultMasterValues>(defaultMasterSchema, {
    defaultValues: {
      name_en: record?.name_en ?? '',
      name_hi: (record?.name_hi as string | null) ?? '',
      display_order: record?.display_order != null ? String(record.display_order) : '',
    },
  });

  useEffect(() => {
    form.reset({
      name_en: record?.name_en ?? '',
      name_hi: (record?.name_hi as string | null) ?? '',
      display_order: record?.display_order != null ? String(record.display_order) : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const create = useCreateMaster(config.key);
  const update = useUpdateMaster(config.key, record?.id ?? '');
  const saving = create.isPending || update.isPending;

  const onSubmit = async (values: DefaultMasterValues) => {
    const payload: MasterPayload = buildDefaultMasterPayload(values);
    if (isEdit && record) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <FormSection>
        <TextField<DefaultMasterValues>
          name="name_en"
          label="Name (English)"
          required
          placeholder="e.g. Training Workshop"
        />
        <TextField<DefaultMasterValues>
          name="name_hi"
          label="नाम (Hindi)"
          placeholder="e.g. प्रशिक्षण कार्यशाला"
        />
        {config.hasDisplayOrder !== false && (
          <TextField<DefaultMasterValues>
            name="display_order"
            label="Display order"
            type="number"
            placeholder="0"
          />
        )}
      </FormSection>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Add record'}
        </Button>
      </div>
    </Form>
  );
}

// ── Financial Year form (label / start_date / end_date) ───────────────────────

function FinancialYearForm({
  config,
  record,
  onClose,
}: {
  config: MasterTypeConfig;
  record?: MasterRecord;
  onClose: () => void;
}) {
  const isEdit = Boolean(record);
  const form = useZodForm<FinancialYearValues>(financialYearSchema as never, {
    defaultValues: {
      label: (record?.label as string) ?? '',
      start_date: (record?.start_date as string) ?? '',
      end_date: (record?.end_date as string) ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      label: (record?.label as string) ?? '',
      start_date: (record?.start_date as string) ?? '',
      end_date: (record?.end_date as string) ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const create = useCreateMaster(config.key);
  const update = useUpdateMaster(config.key, record?.id ?? '');
  const saving = create.isPending || update.isPending;

  const onSubmit = async (values: FinancialYearValues) => {
    const payload = buildFinancialYearPayload(values);
    if (isEdit && record) {
      await update.mutateAsync(payload as unknown as Partial<MasterPayload>);
    } else {
      await create.mutateAsync(payload as unknown as MasterPayload);
    }
    onClose();
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <FormSection>
        <TextField<FinancialYearValues>
          name="label"
          label="Financial year label"
          required
          placeholder="e.g. 2025-2026"
          description="Format: YYYY-YYYY"
        />
        <DateField<FinancialYearValues> name="start_date" label="Start date" required />
        <DateField<FinancialYearValues>
          name="end_date"
          label="End date"
          required
          description="Must be on or after start date."
        />
      </FormSection>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Add financial year'}
        </Button>
      </div>
    </Form>
  );
}

// ── Outer dialog ──────────────────────────────────────────────────────────────

export interface MasterFormDialogProps {
  open: boolean;
  onClose: () => void;
  config: MasterTypeConfig;
  record?: MasterRecord;
}

export function MasterFormDialog({ open, onClose, config, record }: MasterFormDialogProps) {
  const isFy = config.formVariant === 'financial-year';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={record ? 'Edit record' : 'Add record'}
      description={
        isFy
          ? 'Financial year periods are used for reporting and document classification.'
          : 'Names are shown across the public site. Use English as the primary language.'
      }
    >
      {isFy ? (
        <FinancialYearForm config={config} record={record} onClose={onClose} />
      ) : (
        <DefaultMasterForm config={config} record={record} onClose={onClose} />
      )}
    </Dialog>
  );
}
