'use client';

/**
 * Menu item create/edit form. Reuses the shared form framework + the server-side page RelationPicker
 * (internal link) + master-style location select. The hierarchy (parent + order) is configuration the
 * backend persists; the form never computes the tree or validates cycles — the backend rejects an
 * invalid parent and surfaces the error onto the field via the <Form> wrapper.
 *
 * A menu item links EITHER an internal page OR a url. The parent dropdown lists same-location items
 * (excluding the item itself); the backend remains the source of truth for valid parents.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, SelectField, SwitchField } from '@/components/form/fields';
import { FormField } from '@/components/form/form-field';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { RelationPicker, toRelationValue, type RelationOption } from '@/components/relationships';
import { ROUTES } from '@/constants/routes';
import { MENU_LOCATIONS, MENU_LOCATION_LABEL } from '../types';
import type { MenuItem, MenuLocation } from '../types';
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem } from '../hooks';
import {
  buildMenuItemPayload,
  emptyMenuItemForm,
  menuItemToForm,
  type MenuItemFormValues,
} from '../menu-form-payload';

const schema = z
  .object({
    label_en: z.string().trim().min(1, 'English label is required.').max(120),
    label_hi: z.string().max(120),
    location: z.enum(MENU_LOCATIONS),
    link_type: z.enum(['page', 'url']),
    page_id: z.string().nullable(),
    url: z.string().max(500),
    parent_id: z.string(),
    opens_new_tab: z.boolean(),
    is_active: z.boolean(),
    display_order: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.link_type === 'page' && !v.page_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['page_id'], message: 'Select a page to link.' });
    }
    if (v.link_type === 'url') {
      const url = v.url.trim();
      if (!url) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Enter a URL or internal path.' });
      } else if (!((url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: 'Must be an internal path (/about) or an http(s) URL.',
        });
      }
    }
  });

const LOCATION_OPTIONS = MENU_LOCATIONS.map((l) => ({ value: l, label: MENU_LOCATION_LABEL[l] }));
const LINK_TYPE_OPTIONS = [
  { value: 'page', label: 'Internal page' },
  { value: 'url', label: 'URL / internal path' },
];

export interface MenuItemFormProps {
  item?: MenuItem;
  /** Pre-selected location on the create route (e.g. from the active location tab). */
  defaultLocation?: MenuLocation;
}

export function MenuItemForm({ item, defaultLocation = 'header' }: MenuItemFormProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const form = useZodForm<MenuItemFormValues>(schema as never, {
    defaultValues: item ? menuItemToForm(item) : emptyMenuItemForm(defaultLocation),
  });

  const location = form.watch('location');
  const linkType = form.watch('link_type');

  // Parent options come from the backend's same-location items (excluding this item itself).
  const siblings = useMenuItems(location);
  const parentOptions = useMemo(() => {
    const rows = (siblings.data ?? []).filter((m) => m.id !== item?.id);
    return [
      { value: '', label: 'Top level (no parent)' },
      ...rows.map((m) => ({ value: m.id, label: m.label_en })),
    ];
  }, [siblings.data, item?.id]);

  const pageInitial = useMemo<RelationOption[]>(
    () => (item?.page ? [{ value: item.page.id, label: item.page.title_en }] : []),
    [item],
  );

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: MenuItemFormValues) => {
    const payload = buildMenuItemPayload(values);
    if (isEdit && item) {
      const updated = await updateMutation.mutateAsync({ id: item.id, body: payload });
      router.push(`${ROUTES.menus}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.menus}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Label" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={<TextField<MenuItemFormValues> name="label_en" label="Label (English)" required />}
          hindi={<TextField<MenuItemFormValues> name="label_hi" label="लेबल (Hindi)" />}
        />
      </FormSection>

      <FormSection title="Placement" columns={2}>
        <SelectField<MenuItemFormValues> name="location" label="Menu location" options={LOCATION_OPTIONS} />
        <SelectField<MenuItemFormValues>
          name="parent_id"
          label="Parent item"
          options={parentOptions}
          description="Choose a parent to nest this item, or keep it at the top level."
        />
        <TextField<MenuItemFormValues>
          name="display_order"
          label="Display order"
          type="number"
          description="Lower numbers appear first among siblings."
        />
      </FormSection>

      <FormSection title="Destination" columns={2}>
        <SelectField<MenuItemFormValues> name="link_type" label="Link type" options={LINK_TYPE_OPTIONS} />
        {linkType === 'page' ? (
          <FormField<MenuItemFormValues>
            name="page_id"
            label="Linked page"
            render={({ field, invalid }) => (
              <RelationPicker
                resource="pages"
                multiple={false}
                value={toRelationValue(field.value)}
                onChange={(v) => field.onChange(v[0] ?? null)}
                initialOptions={pageInitial}
                placeholder="Search pages…"
                searchPlaceholder="Search pages…"
                invalid={invalid}
              />
            )}
          />
        ) : (
          <TextField<MenuItemFormValues>
            name="url"
            label="URL or internal path"
            placeholder="/about  or  https://example.gov.in"
          />
        )}
      </FormSection>

      <FormSection title="Behaviour & visibility" columns={2}>
        <SwitchField<MenuItemFormValues>
          name="opens_new_tab"
          label="Open in a new tab"
          description="External links should open in a new tab (rel=noopener noreferrer is applied)."
        />
        <SwitchField<MenuItemFormValues> name="is_active" label="Active (visible in navigation)" />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create menu item'}
        </Button>
      </FormActions>
    </Form>
  );
}
