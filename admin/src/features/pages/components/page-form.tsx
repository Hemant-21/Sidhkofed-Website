'use client';

/**
 * Page create/edit form. Reuses the shared form framework + bilingual tabs. Content is plain
 * bilingual text (codex §4.10 — content only; no page builder, no drag-and-drop blocks, no layout
 * editing). Never sets publication state (lifecycle actions handle that). Server-side 422 errors map
 * back onto fields via the <Form> wrapper. Slug is shown read-only after creation (immutable —
 * codex §4.10 / §11).
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
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { PAGES_RESOURCE } from '../api';
import type { PageDetail } from '../types';
import { buildPagePayload, emptyPageForm, pageToForm, type PageFormValues } from '../page-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  body_en: z.string(),
  body_hi: z.string(),
  meta_title_en: z.string().max(255),
  meta_title_hi: z.string().max(255),
  meta_description_en: z.string().max(1000),
  meta_description_hi: z.string().max(1000),
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

export interface PageFormProps {
  page?: PageDetail;
}

export function PageForm({ page }: PageFormProps) {
  const router = useRouter();
  const isEdit = Boolean(page);

  const form = useZodForm<PageFormValues>(schema as never, {
    defaultValues: page ? pageToForm(page) : emptyPageForm(),
  });

  const highlightType = form.watch('highlight_type');

  const createMutation = useCrudCreate<ReturnType<typeof buildPagePayload>, PageDetail>(PAGES_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildPagePayload>, PageDetail>(PAGES_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: PageFormValues) => {
    const payload = buildPagePayload(values);
    if (isEdit && page) {
      const updated = await updateMutation.mutateAsync({ id: page.id, body: payload });
      router.push(`${ROUTES.pages}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.pages}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity">
        <TextField<PageFormValues> name="title_en" label="Title (English)" required />
        <TextField<PageFormValues> name="title_hi" label="शीर्षक (Hindi)" />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10). Plain content — no page builder.">
        <BilingualTabs
          english={
            <TextareaField<PageFormValues> name="body_en" label="Body (English)" rows={12} />
          }
          hindi={<TextareaField<PageFormValues> name="body_hi" label="विवरण (Hindi)" rows={12} />}
        />
      </FormSection>

      <FormSection title="SEO metadata" description="Optional overrides. Defaults derive from the title/summary (codex §11).">
        <BilingualTabs
          english={
            <>
              <TextField<PageFormValues> name="meta_title_en" label="Meta title (English)" />
              <TextareaField<PageFormValues>
                name="meta_description_en"
                label="Meta description (English)"
                rows={2}
              />
            </>
          }
          hindi={
            <>
              <TextField<PageFormValues> name="meta_title_hi" label="मेटा शीर्षक (Hindi)" />
              <TextareaField<PageFormValues>
                name="meta_description_hi"
                label="मेटा विवरण (Hindi)"
                rows={2}
              />
            </>
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<PageFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<PageFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<PageFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<PageFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<PageFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<PageFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<PageFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && page ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="page-slug">Slug (read-only)</Label>
            <Input id="page-slug" value={page.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              The public URL is permanent and cannot be changed after creation.
            </p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create page'}
        </Button>
      </FormActions>
    </Form>
  );
}
