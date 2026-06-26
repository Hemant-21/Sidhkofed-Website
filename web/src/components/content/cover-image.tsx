import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MediaRef } from '@/lib/types/api';

/**
 * Render a media reference as an optimized image with meaningful alt text. Falls
 * back to a neutral placeholder when no media exists. Alt text uses the media
 * `alt_text` → `title` → caption → provided fallback (codex accessibility).
 */
export function CoverImage({
  media,
  fallbackAlt = '',
  className,
  sizes = '(max-width: 768px) 100vw, 400px',
  priority = false,
  rounded = true,
}: {
  media: MediaRef | null | undefined;
  fallbackAlt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: boolean;
}) {
  const wrapper = cn('relative overflow-hidden bg-muted', rounded && 'rounded-md', className);

  if (!media?.url) {
    return (
      <div className={cn(wrapper, 'flex items-center justify-center')} aria-hidden="true">
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  // alt="" marks a decorative image; meaningful images get descriptive text.
  const alt = media.alt_text || media.title || media.caption || fallbackAlt;

  return (
    <div className={wrapper}>
      <Image
        src={media.url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        unoptimized={media.url.startsWith('http://localhost')}
      />
    </div>
  );
}
