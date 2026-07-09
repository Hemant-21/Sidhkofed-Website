'use client';

/**
 * Leadership create/edit form. Reuses the shared form framework, bilingual tabs, and the shared
 * Media picker (CoverMediaField → `photo_media_id`). Never sets publication state. Server-side 422
 * errors map back onto fields via the <Form> wrapper.
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
import { LEADERSHIP_RESOURCE } from '../api';
import type { LeadershipDetail } from '../types';
import {
  buildLeadershipPayload,
  emptyLeadershipForm,
  leadershipToForm,
  type LeadershipFormValues,
} from '../leadership-form-payload';

const schema = z.object({
  name_en: z.string().trim().min(1, 'English name is required.').max(255),
  name_hi: z.string().max(255),
  govt_role_en: z.string().trim().min(1, 'Government role is required.').max(255),
  govt_role_hi: z.string().max(255),
  sidhkofed_role_en: z.string().trim().min(1, 'SIDHKOFED role is required.').max(255),
  sidhkofed_role_hi: z.string().max(255),
  photo_media_id: z.string().nullable(),
  public_visibility: z.boolean(),
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

export interface LeadershipFormProps {
  leader?: LeadershipDetail;
}

export function LeadershipForm({ leader }: LeadershipFormProps) {
  const router = useRouter();
  const isEdit = Boolean(leader);

  const form = useZodForm<LeadershipFormValues>(schema as never, {
    defaultValues: leader ? leadershipToForm(leader) : emptyLeadershipForm(),
  });

  const highlightType = form.watch('highlight_type');

  const createMutation = useCrudCreate<ReturnType<typeof buildLeadershipPayload>, LeadershipDetail>(
    LEADERSHIP_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildLeadershipPayload>, LeadershipDetail>(
    LEADERSHIP_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: LeadershipFormValues) => {
    const payload = buildLeadershipPayload(values);
    if (isEdit && leader) {
      const updated = await updateMutation.mutateAsync({ id: leader.id, body: payload });
      router.push(`${ROUTES.leadership}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.leadership}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Name" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={<TextField<LeadershipFormValues> name="name_en" label="Name (English)" required />}
          hindi={<TextField<LeadershipFormValues> name="name_hi" label="नाम (Hindi)" />}
        />
      </FormSection>

      <FormSection title="Government role" description="English is required; Hindi is optional.">
        <BilingualTabs
          english={
            <TextareaField<LeadershipFormValues>
              name="govt_role_en"
              label="Government role (English)"
              rows={2}
            />
          }
          hindi={
            <TextareaField<LeadershipFormValues>
              name="govt_role_hi"
              label="सरकारी पद (Hindi)"
              rows={2}
            />
          }
        />
      </FormSection>

      <FormSection title="SIDHKOFED role" description="English is required; Hindi is optional.">
        <BilingualTabs
          english={
            <TextareaField<LeadershipFormValues>
              name="sidhkofed_role_en"
              label="SIDHKOFED role (English)"
              rows={2}
            />
          }
          hindi={
            <TextareaField<LeadershipFormValues>
              name="sidhkofed_role_hi"
              label="SIDHKOFED पद (Hindi)"
              rows={2}
            />
          }
        />
      </FormSection>

      <FormSection title="Photo" description="Optional photo from the Media Library.">
        <CoverMediaField<LeadershipFormValues>
          name="photo_media_id"
          label="Photo"
          initialMedia={
            leader?.photo ? { id: leader.photo.id, url: leader.photo.url, alt_text: leader.photo.alt_text } : null
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<LeadershipFormValues> name="public_visibility" label="Publicly visible" />
        <DateField<LeadershipFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<LeadershipFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<LeadershipFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<LeadershipFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<LeadershipFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && leader ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="leadership-slug">Slug (read-only)</Label>
            <Input id="leadership-slug" value={leader.slug} readOnly disabled />
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
          {isEdit ? 'Save changes' : 'Create leadership entry'}
        </Button>
      </FormActions>
    </Form>
  );
}
