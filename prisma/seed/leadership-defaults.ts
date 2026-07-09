/**
 * One-time idempotent seed: populate the real SIDHKOFED leadership roster so the public homepage's
 * leadership section isn't empty before an admin ever visits the Leadership admin screen.
 *
 * Upserts by `slug` (the natural key) with `update: {}` — this never overwrites a value an admin (or
 * a previous run) has already edited, even if that value happens to be blank. Safe to re-run on
 * every `npm run db:seed`, in every environment.
 *
 * `photoMediaId` is left `null` — no real photo files exist yet; an admin uploads them later via the
 * admin UI. Unlike the fake demo data in `fixtures.ts`, these are the site's real leadership names
 * and titles.
 */
import { PrismaClient } from '@prisma/client';

interface LeadershipDefault {
  slug: string;
  nameEn: string;
  govtRoleEn: string;
  sidhkofedRoleEn: string;
  displayOrder: number;
}

const LEADERSHIP_DEFAULTS: LeadershipDefault[] = [
  {
    slug: 'hemant-soren',
    nameEn: 'Shri Hemant Soren',
    govtRoleEn: "Hon'ble Chief Minister, Jharkhand",
    sidhkofedRoleEn: 'President, SIDHKOFED',
    displayOrder: 1,
  },
  {
    slug: 'shilpi-neha-tirkey',
    nameEn: 'Shmt. Shilpi Neha Tirkey',
    govtRoleEn: "Hon'ble Minister, Agriculture, Animal Husbandry & Cooperative, Jharkhand",
    sidhkofedRoleEn: 'Vice-President, SIDHKOFED',
    displayOrder: 2,
  },
  {
    slug: 'shashi-ranjan',
    nameEn: 'Shri Shashi Ranjan, I.A.S.',
    govtRoleEn: 'Chief Executive Officer, SIDHKOFED',
    sidhkofedRoleEn: 'CEO, SIDHKOFED',
    displayOrder: 3,
  },
];

export async function seedLeadershipDefaults(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  for (const entry of LEADERSHIP_DEFAULTS) {
    await prisma.leadership.upsert({
      where: { slug: entry.slug },
      update: {}, // never overwrite an existing row — admin edits (or a prior seed) always win
      create: {
        slug: entry.slug,
        nameEn: entry.nameEn,
        govtRoleEn: entry.govtRoleEn,
        sidhkofedRoleEn: entry.sidhkofedRoleEn,
        photoMediaId: null,
        displayOrder: entry.displayOrder,
        publicationState: 'published',
        publishedAt: now,
      },
    });
  }
  console.log(`  ✓ leadership defaults: ensured ${LEADERSHIP_DEFAULTS.length} entries exist`);
}
