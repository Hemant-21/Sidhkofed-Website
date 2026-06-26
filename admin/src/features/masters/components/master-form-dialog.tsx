'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Form } from '@/components/form/form';
import { TextField } from '@/components/form/fields';
import { FormSection } from '@/components/form/form-section';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/components/form/use-zod-form';
import { useCreateMaster, useUpdateMaster } from '../hooks';
import type { MasterRecord, MasterPayload } from '../types';

const schema = z.object({
  name_en: z.string().trim().min(1, 'English name is required.').max(150),
  name_hi: z.string().max(150).optional(),
  display_order: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface MasterFormDialogProps {
  open: boolean;
  onClose: () => void;
  masterKey: string;
  record?: MasterRecord;
}

export function MasterFormDialog({ open, onClose, masterKey, record }: MasterFormDialogProps) {
  const isEdit = Boolean(record);

  const form = useZodForm<FormValues>(schema, {
    defaultValues: {
      name_en: record?.name_en ?? '',
      name_hi: record?.name_hi ?? '',
      display_order: record?.display_order != null ? String(record.display_order) : '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name_en: record?.name_en ?? '',
        name_hi: record?.name_hi ?? '',
        display_order: record?.display_order != null ? String(record.display_order) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  const create = useCreateMaster(masterKey);
  const update = useUpdateMaster(masterKey, record?.id ?? '');
  const saving = create.isPending || update.isPending;

  const onSubmit = async (values: FormValues) => {
    const payload: MasterPayload = {
      name_en: values.name_en,
      name_hi: values.name_hi || null,
      display_order: values.display_order ? Number(values.display_order) : null,
    };
    if (isEdit && record) {
      await update.mutateAsync(payload);
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={isEdit ? 'Edit record' : 'Add record'}
      description="Names are shown across the public site. Use English as the primary language."
    >
      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <FormSection>
          <TextField<FormValues>
            name="name_en"
            label="Name (English)"
            required
            placeholder="e.g. Training Workshop"
          />
          <TextField<FormValues>
            name="name_hi"
            label="नाम (Hindi)"
            placeholder="e.g. प्रशिक्षण कार्यशाला"
          />
          <TextField<FormValues>
            name="display_order"
            label="Display order"
            type="number"
            placeholder="0"
          />
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
    </Dialog>
  );
}
