'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import type { Video } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { Card } from '@/components/ui/card';

export function VideoCard({ video }: { video: Video }) {
  const { language } = useLanguage();
  const title = pickText(video.title_en, video.title_hi, language);

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={video.public_url} className="relative block aspect-[4/3] w-full overflow-hidden bg-muted focus-visible:outline-none">
        <Image
          src={video.thumbnail_url}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
          <PlayCircle className="h-12 w-12 text-white drop-shadow" aria-hidden="true" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={video.public_url} className="hover:text-primary hover:underline">
            {title}
          </Link>
        </h3>
      </div>
    </Card>
  );
}
