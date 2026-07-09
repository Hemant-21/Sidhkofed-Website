'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui/container';

const LEADERS = [
  {
    name: 'Shri Hemant Soren',
    govtRole: "Hon'ble Chief Minister, Jharkhand",
    sidhkofedRole: 'President, SIDHKOFED',
    image: '/leaders/hemant-soren.jpg',
    initials: 'HS',
  },
  {
    name: 'Shmt. Shilpi Neha Tirkey',
    govtRole: "Hon'ble Minister, Agriculture, Animal Husbandry & Cooperative, Jharkhand",
    sidhkofedRole: 'Vice-President, SIDHKOFED',
    image: '/leaders/shilpi-neha-tirkey.jpg',
    initials: 'ST',
  },
  {
    name: 'Shri Shashi Ranjan, I.A.S.',
    govtRole: 'Chief Executive Officer, SIDHKOFED',
    sidhkofedRole: 'CEO, SIDHKOFED',
    image: '/leaders/shashi-ranjan.jpg',
    initials: 'SR',
  },
];

function LeaderPhoto({ src, alt, initials }: { src: string; alt: string; initials: string }) {
  const [error, setError] = useState(false);

  if (error) {
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
      />
    </div>
  );
}

export function LeadersSection() {
  return (
    <section aria-label="Leadership" className="border-b border-border bg-surface">
      <Container className="py-14">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Our Leadership
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {LEADERS.map((leader) => (
            <div
              key={leader.name}
              className="group flex items-center gap-4 rounded-xl border border-border bg-background p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="shrink-0">
                <LeaderPhoto src={leader.image} alt={leader.name} initials={leader.initials} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{leader.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{leader.govtRole}</p>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {leader.sidhkofedRole}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
