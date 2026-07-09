'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui/container';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import type { Leader } from '@/lib/types/content';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function LeaderPhoto({ src, alt, initials }: { src: string | null; alt: string; initials: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-xl font-black text-primary ring-2 ring-primary/20">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-primary/20">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        onError={() => setError(true)}
        unoptimized={src.startsWith('http://localhost')}
      />
    </div>
  );
}

/** CMS-driven leadership strip — sourced from `/public/leadership`, admin-managed via
 *  the Leadership module (photo upload, bilingual name/roles, display order). Hidden
 *  entirely when the CMS has no published entries, same as other conditional homepage
 *  sections (e.g. Activities & Commodities). */
export function LeadersSection({ leaders }: { leaders: Leader[] }) {
  const { language } = useLanguage();
  if (leaders.length === 0) return null;

  return (
    <section aria-label="Leadership" className="border-b border-border bg-surface">
      <Container className="py-14">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Our Leadership
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {leaders.map((leader) => {
            const name = pickText(leader.name_en, leader.name_hi, language);
            const govtRole = pickText(leader.govt_role_en, leader.govt_role_hi, language);
            const sidhkofedRole = pickText(leader.sidhkofed_role_en, leader.sidhkofed_role_hi, language);
            return (
              <div
                key={leader.id}
                className="group flex items-center gap-4 rounded-xl border border-border bg-background p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="shrink-0">
                  <LeaderPhoto src={leader.photo?.url ?? null} alt={name} initials={initialsOf(name)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{govtRole}</p>
                  <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    {sidhkofedRole}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
