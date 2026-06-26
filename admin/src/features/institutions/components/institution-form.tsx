'use client';

/**
 * Institution create/edit form. Reuses the shared form framework (<Form>, Field components,
 * BilingualTabs, FormSection), the master-option hooks (institution type, district) and the shared
 * CoverMediaField for the logo (media is reused by reference, never re-uploaded ad-hoc). It NEVER
 * sets publication state (that is the lifecycle actions). Server-side 422 errors map back onto
 * fields via the <Form> wrapper. The slug is shown read-only after creation (immutable; codex §11).
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
import { CoverMediaField, useMasterOptions } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { INSTITUTIONS_RESOURCE } from '../api';
import type { InstitutionDetail } from '../types';
import {
  buildInstitutionPayload,
  emptyInstitutionForm,
  institutionToForm,
  type InstitutionFormValues,
} from '../institution-form-payload';

const schema = z.object({
  institution_type_id: z.string().min(1, 'Institution type is required.'),
  name_en: z.string().trim().min(1, 'English name is required.').max(255),
  name_hi: z.string().max(255),
  description_en: z.string(),
  description_hi: z.string(),
  address_en: z.string().max(2000),
  address_hi: z.string().max(2000),
  website_url: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must be a valid http(s) URL.'),
  logo_media_id: z.string().nullable(),
  district_id: z.string(),
  contact_email: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Must be a valid email.'),
  contact_phone: z.string().max(30),
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

export interface InstitutionFormProps {
  institution?: InstitutionDetail;
}

export function InstitutionForm({ institution }: InstitutionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(institution);

  const form = useZodForm<InstitutionFormValues>(schema as never, {
    defaultValues: institution ? institutionToForm(institution) : emptyInstitutionForm(),
  });

  const highlightType = form.watch('highlight_type');

  const institutionTypes = useMasterOptions('institution-types');
  const districts = useMasterOptions('districts');

  const createMutation = useCrudCreate<ReturnType<typeof buildInstitutionPayload>, InstitutionDetail>(INSTITUTIONS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildInstitutionPayload>, InstitutionDetail>(INSTITUTIONS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: InstitutionFormValues) => {
    const payload = buildInstitutionPayload(values);
    if (isEdit && institution) {
      const updated = await updateMutation.mutateAsync({ id: institution.id, body: payload });
      router.push(`${ROUTES.institutions}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.institutions}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Classification" columns={2}>
        <SelectField<InstitutionFormValues>
          name="institution_type_id"
          label="Institution type"
          required
          placeholder="Select institution type"
          options={institutionTypes.options}
        />
        <SelectField<InstitutionFormValues>
          name="district_id"
          label="District"
          placeholder="None"
          options={[{ value: '', label: 'None' }, ...districts.options]}
        />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextField<InstitutionFormValues> name="name_en" label="Name (English)" required />
              <TextareaField<InstitutionFormValues> name="description_en" label="Description (English)" rows={4} />
              <TextareaField<InstitutionFormValues> name="address_en" label="Address (English)" rows={2} />
            </>
          }
          hindi={
            <>
              <TextField<InstitutionFormValues> name="name_hi" label="नाम (Hindi)" />
              <TextareaField<InstitutionFormValues> name="description_hi" label="विवरण (Hindi)" rows={4} />
              <TextareaField<InstitutionFormValues> name="address_hi" label="पता (Hindi)" rows={2} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Contact" columns={2}>
        <TextField<InstitutionFormValues> name="contact_email" label="Contact email" type="email" />
        <TextField<InstitutionFormValues> name="contact_phone" label="Contact phone" />
        <TextField<InstitutionFormValues>
          name="website_url"
          label="Website"
          placeholder="https://example.org"
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Logo" description="Pick from the Media Library or upload once and reuse by reference (codex §5.1).">
        <CoverMediaField<InstitutionFormValues>
          name="logo_media_id"
          label="Institution logo"
          initialMedia={
            institution?.logo ? { id: institution.logo.id, url: institution.logo.url, alt_text: institution.logo.alt_text } : null
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<InstitutionFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<InstitutionFormValues> name="show_on_homepage" label="Show on homepage (partner)" />
        <DateField<InstitutionFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<InstitutionFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<InstitutionFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<InstitutionFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<InstitutionFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && institution ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="institution-slug">Slug (read-only)</Label>
            <Input id="institution-slug" value={institution.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">The public URL is permanent and cannot be changed after creation.</p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create institution'}
        </Button>
      </FormActions>
    </Form>
  );
}
