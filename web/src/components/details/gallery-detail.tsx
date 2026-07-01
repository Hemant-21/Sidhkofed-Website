'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { GalleryDetail } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { BilingualTitle, BilingualLead } from '@/components/content/bilingual';
import { cn } from '@/utils/cn';

export function GalleryDetailView({ gallery }: { gallery: GalleryDetail }) {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const images = gallery.images;
  const total = images.length;

  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  // Keep active thumbnail scrolled into view
  useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const thumb = container.children[current] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  // Sequential download — each triggered from user gesture, 250ms apart so
  // browsers don't block them as non-user-initiated.
  const downloadAll = useCallback(async () => {
    setDownloading(true);
    for (const img of images) {
      const a = document.createElement('a');
      a.href = img.media.url;
      a.download = img.media.file_name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise<void>((r) => setTimeout(r, 250));
    }
    setDownloading(false);
  }, [images]);

  if (total === 0) {
    return (
      <>
        <BilingualTitle en={gallery.title_en} hi={gallery.title_hi} />
        <BilingualLead en={gallery.description_en} hi={gallery.description_hi} />
        <p className="mt-6 text-sm text-muted-foreground">No photos in this gallery yet.</p>
      </>
    );
  }

  // current is always a valid index (guarded by total === 0 above + modular arithmetic)
  const activeImage = images[current]!;
  const caption = pickText(activeImage.caption_en, activeImage.caption_hi, language);

  return (
    <>
      {/* Header row: title + download-all button */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <BilingualTitle en={gallery.title_en} hi={gallery.title_hi} />
          <BilingualLead en={gallery.description_en} hi={gallery.description_hi} />
        </div>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloading ? 'Downloading…' : `Download All (${total})`}
        </button>
      </div>

      {/* Main viewer */}
      <div className="group relative mt-6 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16/9' }}>
        <Image
          key={current}
          src={activeImage.media.url}
          alt={caption || gallery.title_en}
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-contain"
          priority
        />

        {/* Counter badge */}
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
          {current + 1} / {total}
        </span>

        {/* Per-image download */}
        <a
          href={activeImage.media.url}
          download={activeImage.media.file_name}
          rel="noopener"
          className="absolute left-3 top-3 rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
          title="Download this photo"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* Prev arrow */}
        {total > 1 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Next arrow */}
        {total > 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Caption overlay */}
        {caption && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
            <p className="text-sm text-white">{caption}</p>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          ref={thumbsRef}
          role="listbox"
          aria-label="Gallery thumbnails"
          className="mt-3 flex gap-2 overflow-x-auto scroll-smooth pb-2"
        >
          {images.map((img, i) => {
            const thumbAlt = pickText(img.caption_en, img.caption_hi, language) || `Photo ${i + 1}`;
            return (
              <button
                key={img.id}
                role="option"
                aria-selected={i === current}
                onClick={() => setCurrent(i)}
                title={thumbAlt}
                className={cn(
                  'relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all focus-visible:ring-2 focus-visible:ring-primary',
                  i === current
                    ? 'border-primary opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-90',
                )}
              >
                <Image
                  src={img.media.url}
                  alt={thumbAlt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
