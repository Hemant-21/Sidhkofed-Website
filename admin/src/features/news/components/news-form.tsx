'use client';

/**
 * News edit form. Reuses the shared form framework, the bilingual tabs, the cover-media picker, and
 * the CRUD update hook. The linked source event is shown read-only (the link is immutable). News is
 * never created here — only edited (creation is the event's publish-as-news action).
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SwitchField, DateField, SelectField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CoverMediaField } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudUpdate } from '@/hooks/crud';
import { NEWS_RESOURCE } from '../api';
import type { NewsDetail } from '../types';
import { buildNewsPayload, newsToForm, type NewsFormValues } from '../news-form-payload';

const schema = z.object({
  title_en: z.string().trim().min(1, 'English title is required.').max(255),
  title_hi: z.string().max(255),
  summary_en: z.string(),
  summary_hi: z.string(),
  body_en: z.string(),
  body_hi: z.string(),
  cover_media_id: z.string().nullable(),
  news_published_at: z.string(),
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

export function NewsForm({ news }: { news: NewsDetail }) {
  const router = useRouter();
  const form = useZodForm<NewsFormValues>(schema as never, { defaultValues: newsToForm(news) });
  const highlightType = form.watch('highlight_type');
  const update = useCrudUpdate<ReturnType<typeof buildNewsPayload>, NewsDetail>(NEWS_RESOURCE);

  const onSubmit = async (v: NewsFormValues) => {
    const updated = await update.mutateAsync({ id: news.id, body: buildNewsPayload(v) });
    router.push(`${ROUTES.news}/${updated.id}`);
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Linked event">
        <p className="text-sm text-muted-foreground">
          This news is linked to{' '}
          <Link href={`${ROUTES.events}/${news.source_event.id}`} className="text-primary hover:underline">
            {news.source_event.title_en}
          </Link>
          . The link cannot be changed.
        </p>
      </FormSection>

      <FormSection title="Content">
        <BilingualTabs
          english={
            <>
              <TextField<NewsFormValues> name="title_en" label="News title (English)" required />
              <TextareaField<NewsFormValues> name="summary_en" label="Summary (English)" rows={2} />
              <TextareaField<NewsFormValues> name="body_en" label="Body (English, HTML)" rows={8} />
            </>
          }
          hindi={
            <>
              <TextField<NewsFormValues> name="title_hi" label="शीर्षक (Hindi)" />
              <TextareaField<NewsFormValues> name="summary_hi" label="सारांश (Hindi)" rows={2} />
              <TextareaField<NewsFormValues> name="body_hi" label="विवरण (Hindi, HTML)" rows={8} />
            </>
          }
        />
      </FormSection>

      <FormSection title="Cover image">
        <CoverMediaField<NewsFormValues>
          name="cover_media_id"
          label="Cover image"
          initialMedia={news.cover_media ? { id: news.cover_media.id, url: news.cover_media.url, alt_text: news.cover_media.alt_text } : null}
        />
      </FormSection>

      <FormSection title="Publishing & visibility" columns={2}>
        <DateField<NewsFormValues> name="news_published_at" label="News publish date" />
        <DateField<NewsFormValues> name="publish_start_at" label="Scheduled publish date" />
        <SwitchField<NewsFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<NewsFormValues> name="show_on_homepage" label="Show on homepage" />
        <TextField<NewsFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<NewsFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<NewsFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<NewsFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Identifier">
        <div>
          <Label htmlFor="news-slug">Slug (read-only)</Label>
          <Input id="news-slug" value={news.slug} readOnly disabled />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={update.isPending}>
          Save changes
        </Button>
      </FormActions>
    </Form>
  );
}
