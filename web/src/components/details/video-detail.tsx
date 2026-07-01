'use client';

import type { Video } from '@/lib/types/content';
import { BilingualTitle, BilingualLead } from '@/components/content/bilingual';

export function VideoDetailView({ video }: { video: Video }) {
  return (
    <div className="mx-auto max-w-3xl">
      <BilingualTitle en={video.title_en} hi={video.title_hi} />
      <BilingualLead en={video.description_en} hi={video.description_hi} />

      <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
          title={video.title_en}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
