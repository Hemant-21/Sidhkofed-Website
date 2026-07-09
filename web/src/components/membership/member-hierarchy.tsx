'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MembershipSummary } from '@/lib/types/content';

interface Props {
  apexRecord: MembershipSummary | null;
  duRecords: MembershipSummary[];
  totalPrimary: number;
  totalNominal: number;
}

export function MemberHierarchy({ apexRecord, duRecords, totalPrimary, totalNominal }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Level 1 — SIDHKOFED apex */}
      <div className="mx-auto max-w-xs rounded-xl border-2 border-primary bg-primary/5 px-6 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Apex Federation
        </p>
        <h3 className="mt-0.5 text-xl font-bold text-foreground">SIDHKOFED</h3>
      </div>

      {/* Fork: SIDHKOFED → Level 2 */}
      <div className="relative h-10" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-px bg-border" />
        <div className="absolute left-1/4 right-1/4 top-5 h-px bg-border" />
        <div className="absolute left-1/4 top-5 h-5 w-px -translate-x-px bg-border" />
        <div className="absolute right-1/4 top-5 h-5 w-px translate-x-px bg-border" />
      </div>

      {/* Level 2 — 24 DU (left) | 12 Nominal (right) */}
      <div className="grid grid-cols-2 items-start gap-4">

        {/* Branch A — 24 DU + Level 3 below */}
        <div>
          <div className="rounded-xl border-2 border-primary/40 bg-surface px-4 py-4 text-center">
            <p className="text-3xl font-black tabular-nums text-primary">
              {apexRecord ? apexRecord.primary_member_count : 24}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">Primary Members</p>
            <p className="text-xs text-muted-foreground">District Cooperative Unions</p>
          </div>

          {/* Fork: Level 2 → Level 3 */}
          <div className="relative h-10" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-px bg-border" />
            <div className="absolute left-1/4 right-1/4 top-5 h-px bg-border" />
            <div className="absolute left-1/4 top-5 h-5 w-px -translate-x-px bg-border" />
            <div className="absolute right-1/4 top-5 h-5 w-px translate-x-px bg-border" />
          </div>

          {/* Level 3 — 4,454 trigger | 87 Nominal */}
          <div className="grid grid-cols-2 items-stretch gap-3">

            {/* 4,454 — accordion trigger, chevron on right */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-surface px-3 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <p className="text-2xl font-black tabular-nums text-primary">
                  {totalPrimary.toLocaleString('en-IN')}
                </p>
                <p className="text-xs font-semibold text-foreground">Primary</p>
                <p className="text-[10px] text-muted-foreground">(LAMPS / PACS)</p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {/* 87 Nominal — static */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-3 py-3 text-center">
              <p className="text-2xl font-black tabular-nums text-accent">
                {totalNominal.toLocaleString('en-IN')}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">Nominal *</p>
              <p className="text-[10px] text-muted-foreground">(FPOs, SHGs)</p>
            </div>

          </div>
        </div>

        {/* Branch B — 12 Nominal at apex */}
        <div className="rounded-lg border border-border bg-surface px-4 py-4 text-center">
          <p className="text-3xl font-black tabular-nums text-accent">
            {apexRecord ? apexRecord.nominal_member_count : 12}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">Nominal Members *</p>
          <p className="text-xs text-muted-foreground">FPOs, SHGs and others</p>
        </div>

      </div>

      {/* Full-width DU accordion — below the entire tree when 4,454 is clicked */}
      {open && (
        duRecords.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {duRecords.map((du) => {
              const name = du.district?.name_en ?? du.institution?.name_en ?? 'District Union';
              return (
                <div
                  key={du.id}
                  className="rounded-md border border-border bg-surface px-3 py-2"
                >
                  <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                  <p className="text-lg font-black tabular-nums text-primary">
                    {du.primary_member_count.toLocaleString('en-IN')}
                  </p>
                  {du.nominal_member_count > 0 && (
                    <p className="text-[10px] text-accent">+{du.nominal_member_count} nominal</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-border bg-surface px-4 py-3 text-center text-sm text-muted-foreground">
            District data will appear here once entered in the CMS.
          </p>
        )
      )}
    </>
  );
}
