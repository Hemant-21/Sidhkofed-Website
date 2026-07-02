'use client';

/**
 * Publish-as-news dialog (API spec §6: POST /admin/events/{id}/publish-as-news). A completed event
 * may be manually published as a News record whose editorial fields can differ from the event
 * (codex §4.1). All fields are optional overrides — prefilled from the event. The body preview is
 * rendered as escaped text (never dangerouslySetInnerHTML of editor input) to prevent XSS.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SwitchField, DateField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { CoverMediaField } from '@/components/relationships';
import { ROUTES } from '@/constants/routes';
import { usePublishAsNews } from '../api';
import type { EventDetail, PublishAsNewsInput } from '../types';

interface NewsDraftValues {
  title_en: string;
  title_hi: string;
  summary_en: string;
  summary_hi: string;
  body_en: string;
  body_hi: string;
  cover_media_id: string | null;
  news_published_at: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
}

const schema = z.object({
  title_en: z.string().trim().min(1, 'A news title is required.').max(255),
  title_hi: z.string().max(255),
  summary_en: z.string(),
  summary_hi: z.string(),
  body_en: z.string(),
  body_hi: z.string(),
  cover_media_id: z.string().nullable(),
  news_published_at: z.string(),
  public_visibility: z.boolean(),
  show_on_homepage: z.boolean(),
});

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function PublishAsNewsDialog({
  event,
  open,
  onClose,
}: {
  event: EventDetail;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const publishAsNews = usePublishAsNews();

  const form = useZodForm<NewsDraftValues>(schema as never, {
    defaultValues: {
      title_en: event.title_en,
      title_hi: event.title_hi ?? '',
      summary_en: event.summary_en ?? '',
      summary_hi: event.summary_hi ?? '',
      body_en: event.description_en ?? '',
      body_hi: event.description_hi ?? '',
      cover_media_id: event.cover_media?.id ?? null,
      news_published_at: '',
      public_visibility: false,
      show_on_homepage: false,
    },
  });

  const onSubmit = async (v: NewsDraftValues) => {
    const body: PublishAsNewsInput = {
      title_en: v.title_en.trim(),
      title_hi: blank(v.title_hi),
      summary_en: blank(v.summary_en),
      summary_hi: blank(v.summary_hi),
      body_en: blank(v.body_en),
      body_hi: blank(v.body_hi),
      cover_media_id: v.cover_media_id || null,
      news_published_at: v.news_published_at ? `${v.news_published_at}T00:00:00.000Z` : null,
      public_visibility: v.public_visibility,
      show_on_homepage: v.show_on_homepage,
    };
    const created = await publishAsNews.mutateAsync({ id: event.id, body });
    onClose();
    router.push(`${ROUTES.news}/${created.id}`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Publish as news" size="xl">
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">News fields</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Form form={form} onSubmit={onSubmit} className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Customising these fields does not change the source event. The news record stays linked to it.
            </p>
            <BilingualTabs
              english={
                <>
                  <TextField<NewsDraftValues> name="title_en" label="News title (English)" required />
                  <TextareaField<NewsDraftValues> name="summary_en" label="Summary (English)" rows={2} />
                  <TextareaField<NewsDraftValues> name="body_en" label="Body (English, HTML)" rows={6} />
                </>
              }
              hindi={
                <>
                  <TextField<NewsDraftValues> name="title_hi" label="शीर्षक (Hindi)" />
                  <TextareaField<NewsDraftValues> name="summary_hi" label="सारांश (Hindi)" rows={2} />
                  <TextareaField<NewsDraftValues> name="body_hi" label="विवरण (Hindi, HTML)" rows={6} />
                </>
              }
            />
            <FormSection title="News settings" columns={2}>
              <DateField<NewsDraftValues> name="news_published_at" label="News publish date" />
              <div aria-hidden="true" />
              <SwitchField<NewsDraftValues> name="public_visibility" label="Publicly visible" />
              <SwitchField<NewsDraftValues> name="show_on_homepage" label="Show on homepage" />
              <CoverMediaField<NewsDraftValues>
                name="cover_media_id"
                label="News cover image"
                initialMedia={event.cover_media ? { id: event.cover_media.id, url: event.cover_media.url, alt_text: event.cover_media.alt_text } : null}
              />
            </FormSection>
            <FormActions>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={publishAsNews.isPending}>
                Publish as news
              </Button>
            </FormActions>
          </Form>
        </TabsContent>

        <TabsContent value="preview">
          <NewsPreview values={form.watch()} />
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}

/** Escaped preview — body is shown as plain text (no HTML injection). */
function NewsPreview({ values }: { values: NewsDraftValues }) {
  return (
    <article className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{values.title_en || 'Untitled news'}</h2>
      {values.summary_en ? <p className="text-sm text-muted-foreground">{values.summary_en}</p> : null}
      {values.body_en ? (
        <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-foreground">{values.body_en}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">No body content.</p>
      )}
    </article>
  );
}
