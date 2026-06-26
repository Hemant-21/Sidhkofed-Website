'use client';

/**
 * FAQ create/edit form. Reuses the shared form framework, bilingual tabs, and the FAQ Category
 * master-option hook. Never sets publication state (lifecycle actions handle that). Server-side 422
 * errors map back onto fields via the <Form> wrapper.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextareaField, SelectField, SwitchField, DateField, TextField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { useMasterOptions } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { FAQS_RESOURCE } from '../api';
import type { FaqDetail } from '../types';
import { buildFaqPayload, emptyFaqForm, faqToForm, type FaqFormValues } from '../faq-form-payload';

const schema = z.object({
  faq_category_id: z.string(),
  question_en: z.string().trim().min(1, 'English question is required.').max(500),
  question_hi: z.string().max(500),
  answer_en: z.string().trim().min(1, 'English answer is required.').max(20000),
  answer_hi: z.string().max(20000),
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

export interface FaqFormProps {
  faq?: FaqDetail;
}

export function FaqForm({ faq }: FaqFormProps) {
  const router = useRouter();
  const isEdit = Boolean(faq);

  const form = useZodForm<FaqFormValues>(schema as never, {
    defaultValues: faq ? faqToForm(faq) : emptyFaqForm(),
  });

  const highlightType = form.watch('highlight_type');
  const categories = useMasterOptions('faq-categories');
  const categoryOptions = [{ value: '', label: 'Uncategorised' }, ...categories.options];

  const createMutation = useCrudCreate<ReturnType<typeof buildFaqPayload>, FaqDetail>(FAQS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildFaqPayload>, FaqDetail>(FAQS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: FaqFormValues) => {
    const payload = buildFaqPayload(values);
    if (isEdit && faq) {
      const updated = await updateMutation.mutateAsync({ id: faq.id, body: payload });
      router.push(`${ROUTES.faqs}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.faqs}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Question & answer" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextareaField<FaqFormValues>
                name="question_en"
                label="Question (English)"
                rows={2}
                required
              />
              <TextareaField<FaqFormValues> name="answer_en" label="Answer (English)" rows={8} required />
            </>
          }
          hindi={
            <>
              <TextareaField<FaqFormValues> name="question_hi" label="प्रश्न (Hindi)" rows={2} />
              <TextareaField<FaqFormValues> name="answer_hi" label="उत्तर (Hindi)" rows={8} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Classification" columns={2}>
        <SelectField<FaqFormValues> name="faq_category_id" label="Category" options={categoryOptions} />
        <TextField<FaqFormValues> name="display_order" label="Display order" type="number" />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<FaqFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<FaqFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<FaqFormValues> name="publish_start_at" label="Scheduled publish date" />
        <SelectField<FaqFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<FaqFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<FaqFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create FAQ'}
        </Button>
      </FormActions>
    </Form>
  );
}
