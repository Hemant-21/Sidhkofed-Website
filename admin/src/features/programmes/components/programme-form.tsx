'use client';

/**
 * Programme create/edit form. Reuses the shared form framework (<Form>, Field components,
 * BilingualTabs, FormSection), the master-option hooks (commodities, training types) and the shared
 * CoverMediaField. It NEVER sets publication state (that is the lifecycle actions). Server-side 422
 * errors map back onto fields via the <Form> wrapper. The slug is shown read-only after creation
 * (immutable; codex §11).
 *
 * The relation arrays are bounded master lists (commodities / training types), so they use the
 * eager <MultiSelectField>; programmes carry no content-relation arrays (institutions/documents/
 * galleries) in the backend contract, so none are rendered.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, MultiSelectField, SelectField, SwitchField, DateField } from '@/components/form/fields';
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
import { PROGRAMMES_RESOURCE } from '../api';
import type { ProgrammeDetail } from '../types';
import {
  buildProgrammePayload,
  emptyProgrammeForm,
  programmeToForm,
  type ProgrammeFormValues,
} from '../programme-form-payload';

const schema = z
  .object({
    title_en: z.string().trim().min(1, 'English title is required.').max(255),
    title_hi: z.string().max(255),
    short_code: z.string().max(60),
    summary_en: z.string(),
    summary_hi: z.string(),
    description_en: z.string(),
    description_hi: z.string(),
    objectives_en: z.string(),
    objectives_hi: z.string(),
    eligibility_en: z.string(),
    eligibility_hi: z.string(),
    benefits_en: z.string(),
    benefits_hi: z.string(),
    application_process_en: z.string(),
    application_process_hi: z.string(),
    funding_source: z.string().max(255),
    start_date: z.string(),
    end_date: z.string(),
    cover_media_id: z.string().nullable(),
    commodity_ids: z.array(z.string()),
    permitted_training_type_ids: z.array(z.string()),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    // Mirror the backend: end cannot precede start (programmes.validators.ts refineDateOrder).
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'Must be on or after the start date.' });
    }
  });

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({ value: k, label: HIGHLIGHT_LABEL[k] })),
];

export interface ProgrammeFormProps {
  programme?: ProgrammeDetail;
}

export function ProgrammeForm({ programme }: ProgrammeFormProps) {
  const router = useRouter();
  const isEdit = Boolean(programme);

  const form = useZodForm<ProgrammeFormValues>(schema as never, {
    defaultValues: programme ? programmeToForm(programme) : emptyProgrammeForm(),
  });

  const highlightType = form.watch('highlight_type');

  const commodities = useMasterOptions('commodities');
  const trainingTypes = useMasterOptions('training-types');

  const createMutation = useCrudCreate<ReturnType<typeof buildProgrammePayload>, ProgrammeDetail>(PROGRAMMES_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildProgrammePayload>, ProgrammeDetail>(PROGRAMMES_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ProgrammeFormValues) => {
    const payload = buildProgrammePayload(values);
    if (isEdit && programme) {
      const updated = await updateMutation.mutateAsync({ id: programme.id, body: payload });
      router.push(`${ROUTES.programmes}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.programmes}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<ProgrammeFormValues> name="title_en" label="Title (English)" required />
        <TextField<ProgrammeFormValues> name="short_code" label="Short code" placeholder="e.g. MFP-2026" />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextField<ProgrammeFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<ProgrammeFormValues> name="summary_en" label="Summary (English)" rows={2} />
              <TextareaField<ProgrammeFormValues> name="description_en" label="Description (English)" rows={5} />
              <TextareaField<ProgrammeFormValues> name="objectives_en" label="Objectives (English)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="eligibility_en" label="Eligibility (English)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="benefits_en" label="Benefits (English)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="application_process_en" label="Application process (English)" rows={3} />
            </>
          }
          hindi={
            <>
              <TextareaField<ProgrammeFormValues> name="summary_hi" label="सारांश (Hindi)" rows={2} />
              <TextareaField<ProgrammeFormValues> name="description_hi" label="विवरण (Hindi)" rows={5} />
              <TextareaField<ProgrammeFormValues> name="objectives_hi" label="उद्देश्य (Hindi)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="eligibility_hi" label="पात्रता (Hindi)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="benefits_hi" label="लाभ (Hindi)" rows={3} />
              <TextareaField<ProgrammeFormValues> name="application_process_hi" label="आवेदन प्रक्रिया (Hindi)" rows={3} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Funding & timeline" columns={2}>
        <TextField<ProgrammeFormValues> name="funding_source" label="Sponsoring department / funding source" className="sm:col-span-2" />
        <DateField<ProgrammeFormValues> name="start_date" label="Start date" />
        <DateField<ProgrammeFormValues> name="end_date" label="End date" />
      </FormSection>

      <FormSection title="Relationships" description="Linked commodities and the training types this programme permits." columns={2}>
        <MultiSelectField<ProgrammeFormValues> name="commodity_ids" label="Commodities" options={commodities.options} />
        <MultiSelectField<ProgrammeFormValues>
          name="permitted_training_type_ids"
          label="Permitted training types"
          options={trainingTypes.options}
        />
      </FormSection>

      <FormSection title="Cover image">
        <CoverMediaField<ProgrammeFormValues>
          name="cover_media_id"
          label="Cover image"
          description="Used as the social/share image and listing thumbnail."
          initialMedia={
            programme?.cover_media
              ? { id: programme.cover_media.id, url: programme.cover_media.url, alt_text: programme.cover_media.alt_text }
              : null
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<ProgrammeFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<ProgrammeFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<ProgrammeFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<ProgrammeFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<ProgrammeFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<ProgrammeFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<ProgrammeFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && programme ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="programme-slug">Slug (read-only)</Label>
            <Input id="programme-slug" value={programme.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">The public URL is permanent and cannot be changed after creation.</p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create programme'}
        </Button>
      </FormActions>
    </Form>
  );
}
