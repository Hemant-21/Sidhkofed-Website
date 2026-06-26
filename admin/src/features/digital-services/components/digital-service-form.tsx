'use client';

/**
 * Digital Service create/edit form. Reuses the shared form framework, bilingual tabs, and the shared
 * Media picker (CoverMediaField → `icon_media_id`). `external_url` must be a valid HTTPS URL — the
 * client opens it in a new tab; the CMS never proxies/embeds the external system (codex §4.14). Never
 * sets publication state. Server-side 422 errors map back onto fields via the <Form> wrapper.
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
import { CoverMediaField } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { DIGITAL_SERVICES_RESOURCE } from '../api';
import type { DigitalServiceDetail } from '../types';
import {
  buildDigitalServicePayload,
  emptyDigitalServiceForm,
  digitalServiceToForm,
  type DigitalServiceFormValues,
} from '../digital-service-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  description_en: z.string(),
  description_hi: z.string(),
  external_url: z
    .string()
    .trim()
    .min(1, 'External URL is required.')
    .url('Enter a valid URL.')
    .refine((u) => /^https:\/\//i.test(u), 'Must be a secure https:// URL.'),
  icon_media_id: z.string().nullable(),
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
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

export interface DigitalServiceFormProps {
  service?: DigitalServiceDetail;
}

export function DigitalServiceForm({ service }: DigitalServiceFormProps) {
  const router = useRouter();
  const isEdit = Boolean(service);

  const form = useZodForm<DigitalServiceFormValues>(schema as never, {
    defaultValues: service ? digitalServiceToForm(service) : emptyDigitalServiceForm(),
  });

  const highlightType = form.watch('highlight_type');

  const createMutation = useCrudCreate<ReturnType<typeof buildDigitalServicePayload>, DigitalServiceDetail>(
    DIGITAL_SERVICES_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildDigitalServicePayload>, DigitalServiceDetail>(
    DIGITAL_SERVICES_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: DigitalServiceFormValues) => {
    const payload = buildDigitalServicePayload(values);
    if (isEdit && service) {
      const updated = await updateMutation.mutateAsync({ id: service.id, body: payload });
      router.push(`${ROUTES.digitalServices}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.digitalServices}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<DigitalServiceFormValues>
          name="title_en"
          label="Service name (English)"
          required
        />
        <TextField<DigitalServiceFormValues> name="title_hi" label="सेवा का नाम (Hindi)" />
        <TextField<DigitalServiceFormValues>
          name="external_url"
          label="External URL (https)"
          required
          placeholder="https://erp.example.gov.in"
          description="Opens in a new tab with rel=noopener noreferrer. The CMS never embeds or proxies it."
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Description" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <TextareaField<DigitalServiceFormValues>
              name="description_en"
              label="Description (English)"
              rows={4}
            />
          }
          hindi={
            <TextareaField<DigitalServiceFormValues>
              name="description_hi"
              label="विवरण (Hindi)"
              rows={4}
            />
          }
        />
      </FormSection>

      <FormSection title="Icon" description="Optional icon from the Media Library.">
        <CoverMediaField<DigitalServiceFormValues>
          name="icon_media_id"
          label="Service icon"
          initialMedia={
            service?.icon ? { id: service.icon.id, url: service.icon.url, alt_text: service.icon.alt_text } : null
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<DigitalServiceFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<DigitalServiceFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<DigitalServiceFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<DigitalServiceFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<DigitalServiceFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<DigitalServiceFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<DigitalServiceFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && service ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="ds-slug">Slug (read-only)</Label>
            <Input id="ds-slug" value={service.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              The public identifier is permanent and cannot be changed after creation.
            </p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create digital service'}
        </Button>
      </FormActions>
    </Form>
  );
}
