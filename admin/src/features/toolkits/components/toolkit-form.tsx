'use client';

/**
 * Toolkit create/edit form. Reuses the shared form framework (<Form>, Field components,
 * BilingualTabs, FormSection), the master-option hook (commodity), the shared server-side
 * RelationPicker (programme) and the CoverMediaField. It NEVER sets publication state (that is the
 * lifecycle actions). Server-side 422 errors map back onto fields via the <Form> wrapper. The slug
 * is shown read-only after creation (immutable; codex §11).
 *
 * Catalogue ITEMS are a nested resource that needs a saved toolkit id, so they are managed on the
 * detail page (ToolkitItemsManager), matching the backend model (API spec §6).
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
import { CoverMediaField, RelationPicker, toRelationValue, useMasterOptions, type RelationOption } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { TOOLKITS_RESOURCE } from '../api';
import type { ToolkitDetail } from '../types';
import { buildToolkitPayload, emptyToolkitForm, toolkitToForm, type ToolkitFormValues } from '../toolkit-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  summary_en: z.string(),
  summary_hi: z.string(),
  description_en: z.string(),
  description_hi: z.string(),
  programme_scheme_id: z.string(),
  commodity_id: z.string(),
  cover_media_id: z.string().nullable(),
  public_visibility: z.boolean(),
  show_on_homepage: z.boolean(),
  highlight_type: z.string(),
  highlight_start_at: z.string(),
  highlight_end_at: z.string(),
  display_order: z.string(),
  publish_start_at: z.string(),
});

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({ value: k, label: HIGHLIGHT_LABEL[k] })),
];

export interface ToolkitFormProps {
  toolkit?: ToolkitDetail;
}

export function ToolkitForm({ toolkit }: ToolkitFormProps) {
  const router = useRouter();
  const isEdit = Boolean(toolkit);

  const form = useZodForm<ToolkitFormValues>(schema as never, {
    defaultValues: toolkit ? toolkitToForm(toolkit) : emptyToolkitForm(),
  });

  const highlightType = form.watch('highlight_type');
  const commodities = useMasterOptions('commodities');

  const programmeInitial = useMemo<RelationOption[]>(
    () => (toolkit?.programme ? [{ value: toolkit.programme.id, label: toolkit.programme.title_en }] : []),
    [toolkit],
  );

  const createMutation = useCrudCreate<ReturnType<typeof buildToolkitPayload>, ToolkitDetail>(TOOLKITS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildToolkitPayload>, ToolkitDetail>(TOOLKITS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ToolkitFormValues) => {
    const payload = buildToolkitPayload(values);
    if (isEdit && toolkit) {
      const updated = await updateMutation.mutateAsync({ id: toolkit.id, body: payload });
      router.push(`${ROUTES.toolkits}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.toolkits}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextField<ToolkitFormValues> name="title_en" label="Title (English)" required />
              <TextareaField<ToolkitFormValues> name="summary_en" label="Summary (English)" rows={2} />
              <TextareaField<ToolkitFormValues> name="description_en" label="Description (English)" rows={5} />
            </>
          }
          hindi={
            <>
              <TextField<ToolkitFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<ToolkitFormValues> name="summary_hi" label="सारांश (Hindi)" rows={2} />
              <TextareaField<ToolkitFormValues> name="description_hi" label="विवरण (Hindi)" rows={5} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Linkage" description="A toolkit connects a programme/scheme and a commodity (codex §4.3)." columns={2}>
        <FormField<ToolkitFormValues>
          name="programme_scheme_id"
          label="Programme / scheme"
          render={({ field, invalid }) => (
            <RelationPicker
              resource="programmes"
              multiple={false}
              value={toRelationValue(field.value)}
              onChange={(v) => field.onChange(v[0] ?? '')}
              initialOptions={programmeInitial}
              placeholder="Link a programme…"
              searchPlaceholder="Search programmes…"
              invalid={invalid}
            />
          )}
        />
        <SelectField<ToolkitFormValues>
          name="commodity_id"
          label="Commodity"
          placeholder="None"
          options={[{ value: '', label: 'None' }, ...commodities.options]}
        />
      </FormSection>

      <FormSection title="Cover image">
        <CoverMediaField<ToolkitFormValues>
          name="cover_media_id"
          label="Cover image"
          description="Used as the social/share image and listing thumbnail."
          initialMedia={
            toolkit?.cover_media ? { id: toolkit.cover_media.id, url: toolkit.cover_media.url, alt_text: toolkit.cover_media.alt_text } : null
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<ToolkitFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<ToolkitFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<ToolkitFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<ToolkitFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<ToolkitFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<ToolkitFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<ToolkitFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && toolkit ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="toolkit-slug">Slug (read-only)</Label>
            <Input id="toolkit-slug" value={toolkit.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">The public URL is permanent and cannot be changed after creation.</p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create toolkit'}
        </Button>
      </FormActions>
    </Form>
  );
}
