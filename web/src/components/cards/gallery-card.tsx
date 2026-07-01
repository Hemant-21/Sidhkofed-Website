'use client';

import Link from 'next/link';
import { Images } from 'lucide-react';
import type { GallerySummary } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Card } from '@/components/ui/card';
import { CoverImage } from '@/components/content/cover-image';

export function GalleryCard({ gallery }: { gallery: GallerySummary }) {
  const { language } = useLanguage();
  const title = pickText(gallery.title_en, gallery.title_hi, language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={gallery.public_url} className="block focus-visible:outline-none">
        <CoverImage media={gallery.cover_media} fallbackAlt={title} className="aspect-[4/3] w-full" rounded={false} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={gallery.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
          <Images className="h-3.5 w-3.5" aria-hidden="true" />
          {gallery.image_count} {gallery.image_count === 1 ? 'photo' : 'photos'}
        </span>
      </div>
    </Card>
  );
}
