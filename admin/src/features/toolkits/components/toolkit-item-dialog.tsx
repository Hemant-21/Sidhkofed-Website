'use client';

/**
 * Add/edit dialog for a toolkit catalogue item. Reuses the shared <Form> + Field components and the
 * item create/update mutations. Validation mirrors the backend (items.validators.ts): a `group`
 * basis requires a positive group size; quantities are non-negative. The backend owns any totals —
 * this only captures catalogue defaults. Server 422s map back onto fields via <Form>.
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SelectField, SwitchField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { useCreateToolkitItem, useUpdateToolkitItem } from '../api';
import type { ToolkitItem } from '../types';
import {
  buildToolkitItemPayload,
  emptyToolkitItemForm,
  toolkitItemToForm,
  type ToolkitItemFormValues,
} from '../toolkit-item-payload';

const schema = z
  .object({
    name_en: z.string().trim().min(1, 'English name is required.').max(255),
    name_hi: z.string().max(255),
    description_en: z.string(),
    description_hi: z.string(),
    unit: z.string().max(50),
    distribution_basis: z.enum(['individual', 'group']),
    default_quantity_per_unit: z.string(),
    default_group_size: z.string(),
    is_active: z.boolean(),
    display_order: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.distribution_basis === 'group' && v.default_group_size.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default_group_size'], message: 'A group basis requires a group size.' });
    }
    const checkNum = (raw: string, path: 'default_quantity_per_unit' | 'default_group_size') => {
      if (raw.trim() === '') return;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: 'Must be zero or greater.' });
    };
    checkNum(v.default_quantity_per_unit, 'default_quantity_per_unit');
    checkNum(v.default_group_size, 'default_group_size');
  });

const BASIS_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
];

export interface ToolkitItemDialogProps {
  open: boolean;
  onClose: () => void;
  toolkitId: string;
  /** The item being edited; omit for create. */
  item?: ToolkitItem;
  /** Display order to seed a new item with (append to the end). */
  nextDisplayOrder?: number;
}

export function ToolkitItemDialog({ open, onClose, toolkitId, item, nextDisplayOrder = 0 }: ToolkitItemDialogProps) {
  const isEdit = Boolean(item);
  const create = useCreateToolkitItem();
  const update = useUpdateToolkitItem();
  const saving = create.isPending || update.isPending;

  const form = useZodForm<ToolkitItemFormValues>(schema as never, {
    defaultValues: item ? toolkitItemToForm(item) : emptyToolkitItemForm(nextDisplayOrder),
  });

  // Re-seed the form whenever the dialog opens for a different item / fresh add.
  useEffect(() => {
    if (open) form.reset(item ? toolkitItemToForm(item) : emptyToolkitItemForm(nextDisplayOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const basis = form.watch('distribution_basis');

  const onSubmit = async (values: ToolkitItemFormValues) => {
    const body = buildToolkitItemPayload(values);
    if (isEdit && item) {
      await update.mutateAsync({ toolkitId, itemId: item.id, body });
    } else {
      await create.mutateAsync({ toolkitId, body });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit toolkit item' : 'Add toolkit item'}
      description="Catalogue-level definition. Distribution totals are recorded per event and calculated by the backend."
      dismissible={!saving}
    >
      <Form form={form} onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Name">
          <BilingualTabs
            english={
              <>
                <TextField<ToolkitItemFormValues> name="name_en" label="Name (English)" required />
                <TextareaField<ToolkitItemFormValues> name="description_en" label="Description (English)" rows={2} />
              </>
            }
            hindi={
              <>
                <TextField<ToolkitItemFormValues> name="name_hi" label="नाम (Hindi)" />
                <TextareaField<ToolkitItemFormValues> name="description_hi" label="विवरण (Hindi)" rows={2} />
              </>
            }
          />
        </FormSection>

        <FormSection title="Distribution defaults" columns={2}>
          <SelectField<ToolkitItemFormValues> name="distribution_basis" label="Distribution basis" options={BASIS_OPTIONS} />
          <TextField<ToolkitItemFormValues> name="unit" label="Unit" placeholder="e.g. kit, kg, set" />
          <TextField<ToolkitItemFormValues> name="default_quantity_per_unit" label="Default quantity per unit" type="number" />
          {basis === 'group' ? (
            <TextField<ToolkitItemFormValues> name="default_group_size" label="Default group size" type="number" required />
          ) : (
            <div aria-hidden="true" />
          )}
          <TextField<ToolkitItemFormValues> name="display_order" label="Display order" type="number" />
          <SwitchField<ToolkitItemFormValues> name="is_active" label="Active" />
        </FormSection>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Save item' : 'Add item'}
          </Button>
        </FormActions>
      </Form>
    </Dialog>
  );
}
