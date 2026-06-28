'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { buttonClasses } from '@/components/ui/button';
import type { GalleryImage } from '@/lib/types/content';

interface HeroSearchProps {
  slides: GalleryImage[];
}

const STATS = [
  { value: '24',      label: 'Districts' },
  { value: '3,000+', label: 'Members' },
  { value: '₹12 Cr+', label: 'MFP Procured' },
];

export function HeroSearch({ slides }: HeroSearchProps) {
  const { t, language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const hasSlides = slides.length > 0;
  const isCarousel = slides.length > 1;

  const next = useCallback(() => setCurrent((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (!isCarousel) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [isCarousel, next]);

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2">

        {/* ── LEFT PANEL ── */}
        <div className="relative flex items-center overflow-hidden px-5 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-24 xl:px-20">

          {/* Accent bar — far left edge */}
          <div className="absolute inset-y-0 left-0 w-[3px] bg-accent" />

          {/* Dot grid texture */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Decorative concentric circles — hidden on mobile, visible on lg+ */}
          <div className="pointer-events-none absolute -bottom-24 -right-24 hidden h-80 w-80 rounded-full border border-white/[0.06] lg:block" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 hidden h-52 w-52 rounded-full border border-white/[0.09] lg:block" />

          <div className="relative z-10 max-w-xl">
            {/* Eyebrow */}
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/50 sm:mb-5 sm:text-xs">
              Jharkhand Cooperative Federation
            </p>

            {/* Headline — two punchy pairs */}
            <h1
              className="text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-[3.5rem]"
              lang={language}
            >
              From Forest<br />
              <span className="text-accent">to Market.</span>
            </h1>

            {/* Accent rule separating the two headline pairs */}
            <div className="my-3 h-[2px] w-8 rounded-full bg-accent/50 sm:my-4 sm:w-10" />

            <p className="text-2xl font-black leading-[1.08] tracking-tight text-white/45 sm:text-3xl lg:text-[2.75rem]">
              From Village<br />to Value.
            </p>

            {/* Tagline */}
            <p className="mt-5 text-sm leading-relaxed text-white/65 sm:mt-6 sm:text-base lg:max-w-sm" lang={language}>
              {t('site.tagline')}
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-7">
              <Link href="/activities" className={buttonClasses('accent', 'lg')}>
                Explore Activities
              </Link>
              <Link
                href="/procurement"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Procurement <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Inline stat strip */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.12] pt-4 sm:mt-7 sm:gap-x-6 sm:pt-5">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-white">{stat.value}</span>
                  <span className="text-[11px] font-medium text-white/45">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — deeper diagonal, crossfade carousel ── */}
        <div
          className="relative hidden lg:block"
          style={{ clipPath: 'polygon(13% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
        >
          {hasSlides ? (
            <>
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: i === current ? 1 : 0 }}
                  aria-hidden={i !== current}
                >
                  <Image
                    src={slide.media.url}
                    alt={slide.media.alt_text || slide.caption_en || slide.media.title || ''}
                    fill
                    className="object-cover"
                    priority={i === 0}
                    sizes="(max-width: 1280px) 50vw, 640px"
                    unoptimized={slide.media.url.startsWith('http://localhost')}
                  />
                </div>
              ))}

              {/* Caption */}
              {slides[current]?.caption_en && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-12 pt-8">
                  <p className="text-sm font-medium text-white">{slides[current].caption_en}</p>
                </div>
              )}

              {/* Prev / Next arrows */}
              {isCarousel && (
                <>
                  <button
                    onClick={prev}
                    aria-label="Previous slide"
                    className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next slide"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === current ? '1.5rem' : '0.375rem',
                          backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.45)',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <Image
              src="/hero-cooperative.png"
              alt="Cooperative value chains — Jharkhand tribal communities"
              fill
              className="object-cover"
              priority
            />
          )}

          {/* Gradient at the diagonal edge for depth */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
        </div>

      </div>
    </div>
  );
}
