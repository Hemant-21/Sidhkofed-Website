'use client';

/**
 * Video create/edit form. Reuses the shared form framework, the bilingual tabs, the cover-media
 * picker (optional thumbnail override), and the CRUD hooks. The YouTube URL is verified live via
 * the stateless `validate-url` endpoint (instant feedback + derived thumbnail preview); the backend
 * re-validates and extracts the id on save. It NEVER sets publication state (lifecycle actions do).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SwitchField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CoverMediaField } from '@/components/relationships';
import { errorMessage } from '@/lib/api/server-errors';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { VIDEOS_RESOURCE, useValidateYouTubeUrl } from '../api';
import type { Video } from '../types';
import { buildVideoPayload, emptyVideoForm, videoToForm, type VideoFormValues } from '../video-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  description_en: z.string(),
  description_hi: z.string(),
  youtube_url: z.string().trim().min(1, 'A YouTube URL is required.'),
  thumbnail_media_id: z.string().nullable(),
  public_visibility: z.boolean(),
  show_on_homepage: z.boolean(),
  display_order: z.string(),
});

export interface VideoFormProps {
  video?: Video;
}

export function VideoForm({ video }: VideoFormProps) {
  const router = useRouter();
  const isEdit = Boolean(video);
  const form = useZodForm<VideoFormValues>(schema as never, {
    defaultValues: video ? videoToForm(video) : emptyVideoForm(),
  });

  const validate = useValidateYouTubeUrl();
  const [preview, setPreview] = useState<{ youtube_id: string; thumbnail_url: string } | null>(
    video ? { youtube_id: video.youtube_id, thumbnail_url: video.thumbnail_url } : null,
  );

  const createMutation = useCrudCreate<ReturnType<typeof buildVideoPayload>, Video>(VIDEOS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildVideoPayload>, Video>(VIDEOS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const checkUrl = async () => {
    const url = form.getValues('youtube_url').trim();
    if (!url) return;
    try {
      const result = await validate.mutateAsync(url);
      setPreview({ youtube_id: result.youtube_id, thumbnail_url: result.thumbnail_url });
      form.clearErrors('youtube_url');
    } catch (err) {
      setPreview(null);
      form.setError('youtube_url', { type: 'server', message: errorMessage(err) || 'Enter a valid YouTube URL.' });
    }
  };

  const onSubmit = async (values: VideoFormValues) => {
    const payload = buildVideoPayload(values);
    if (isEdit && video) {
      const updated = await updateMutation.mutateAsync({ id: video.id, body: payload });
      router.push(`${ROUTES.videos}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.videos}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="YouTube source" description="Videos stream from YouTube — files are never hosted (codex §5.3).">
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField<VideoFormValues> name="youtube_url" label="YouTube URL" required placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <Button type="button" variant="outline" onClick={checkUrl} isLoading={validate.isPending}>
              Validate
            </Button>
          </div>
          {preview ? (
            <div className="flex items-center gap-3 rounded-md border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.thumbnail_url} alt="" className="h-16 w-28 rounded object-cover" />
              <p className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Valid — video id <code className="text-foreground">{preview.youtube_id}</code>
              </p>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Content" description="English is required; Hindi is optional (codex §10).">
        <BilingualTabs
          english={
            <>
              <TextField<VideoFormValues> name="title_en" label="Title (English)" required />
              <TextareaField<VideoFormValues> name="description_en" label="Description (English)" rows={4} />
            </>
          }
          hindi={
            <>
              <TextField<VideoFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<VideoFormValues> name="description_hi" label="विवरण (Hindi)" rows={4} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Custom thumbnail (optional)" description="Overrides the auto-fetched YouTube thumbnail.">
        <CoverMediaField<VideoFormValues>
          name="thumbnail_media_id"
          label="Thumbnail image"
          initialMedia={null}
        />
      </FormSection>

      <FormSection title="Visibility" columns={2}>
        <SwitchField<VideoFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<VideoFormValues> name="show_on_homepage" label="Show on homepage (max 3 published)" />
        <TextField<VideoFormValues> name="display_order" label="Display order" type="number" />
      </FormSection>

      {isEdit && video ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="video-slug">Slug (read-only)</Label>
            <Input id="video-slug" value={video.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">The public URL is permanent and cannot be changed after creation.</p>
          </div>
        </FormSection>
      ) : null}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create video'}
        </Button>
      </FormActions>
    </Form>
  );
}
