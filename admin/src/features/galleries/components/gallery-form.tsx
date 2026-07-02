'use client';

/**
 * Gallery create/edit form. Reuses the shared form framework, bilingual tabs, and the shared Media
 * picker (CoverMediaField → `cover_media_id`). Never sets publication state (lifecycle actions handle
 * that). Server-side 422 errors map back onto fields via the <Form> wrapper. Images are managed on
 * the detail page after creation (a gallery must exist before images attach to it).
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SwitchField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { CoverMediaField } from '@/components/relationships';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { GALLERIES_RESOURCE } from '../api';
import type { GalleryDetail } from '../types';
import {
  buildGalleryPayload,
  emptyGalleryForm,
  galleryToForm,
  type GalleryFormValues,
} from '../gallery-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  description_en: z.string(),
  description_hi: z.string(),
  cover_media_id: z.string().nullable(),
  public_visibility: z.boolean(),
  show_on_homepage: z.boolean(),
  display_order: z.string(),
});

export interface GalleryFormProps {
  gallery?: GalleryDetail;
}

export function GalleryForm({ gallery }: GalleryFormProps) {
  const router = useRouter();
  const isEdit = Boolean(gallery);

  const form = useZodForm<GalleryFormValues>(schema as never, {
    defaultValues: gallery ? galleryToForm(gallery) : emptyGalleryForm(),
  });

  const createMutation = useCrudCreate<ReturnType<typeof buildGalleryPayload>, GalleryDetail>(GALLERIES_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildGalleryPayload>, GalleryDetail>(GALLERIES_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: GalleryFormValues) => {
    const payload = buildGalleryPayload(values);
    if (isEdit && gallery) {
      const updated = await updateMutation.mutateAsync({ id: gallery.id, body: payload });
      router.push(`${ROUTES.galleries}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.galleries}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity">
        <TextField<GalleryFormValues> name="title_en" label="Title (English)" required />
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <TextareaField<GalleryFormValues>
              name="description_en"
              label="Description (English)"
              rows={4}
            />
          }
          hindi={
            <>
              <TextField<GalleryFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<GalleryFormValues> name="description_hi" label="विवरण (Hindi)" rows={4} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Cover image" description="Optional cover image from the Media Library.">
        <CoverMediaField<GalleryFormValues>
          name="cover_media_id"
          label="Cover image"
          initialMedia={
            gallery?.cover_media
              ? { id: gallery.cover_media.id, url: gallery.cover_media.url ?? '', alt_text: gallery.cover_media.alt_text }
              : null
          }
        />
      </FormSection>

      <FormSection title="Visibility" columns={2}>
        <SwitchField<GalleryFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<GalleryFormValues> name="show_on_homepage" label="Show on homepage" />
        <TextField<GalleryFormValues> name="display_order" label="Display order" type="number" />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create gallery'}
        </Button>
      </FormActions>
    </Form>
  );
}
