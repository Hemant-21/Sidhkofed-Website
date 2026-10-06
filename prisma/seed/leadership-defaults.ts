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
  nameHi: string;
  govtRoleEn: string;
  govtRoleHi: string;
  sidhkofedRoleEn: string;
  sidhkofedRoleHi: string;
  displayOrder: number;
}

const LEADERSHIP_DEFAULTS: LeadershipDefault[] = [
  {
    slug: 'hemant-soren',
    nameEn: 'Shri Hemant Soren',
    nameHi: 'श्री हेमंत सोरेन',
    govtRoleEn: "Hon'ble Chief Minister, Jharkhand",
    govtRoleHi: 'माननीय मुख्यमंत्री, झारखंड',
    sidhkofedRoleEn: 'President, SIDHKOFED',
    sidhkofedRoleHi: 'अध्यक्ष, SIDHKOFED',
    displayOrder: 1,
  },
  {
    slug: 'shilpi-neha-tirkey',
    nameEn: 'Shmt. Shilpi Neha Tirkey',
    nameHi: 'श्रीमती शिल्पी नेहा तिर्की',
    govtRoleEn: "Hon'ble Minister, Agriculture, Animal Husbandry & Cooperative, Jharkhand",
    govtRoleHi: 'माननीय मंत्री, कृषि, पशुपालन एवं सहकारिता, झारखंड',
    sidhkofedRoleEn: 'Vice-President, SIDHKOFED',
    sidhkofedRoleHi: 'उपाध्यक्ष, SIDHKOFED',
    displayOrder: 2,
  },
  {
    slug: 'shashi-ranjan',
    nameEn: 'Shri Shashi Ranjan, I.A.S.',
    nameHi: 'श्री शशि रंजन, भा.प्र.से.',
    govtRoleEn: 'Chief Executive Officer, SIDHKOFED',
    govtRoleHi: 'मुख्य कार्यपालक पदाधिकारी, SIDHKOFED',
    sidhkofedRoleEn: 'CEO, SIDHKOFED',
    sidhkofedRoleHi: 'मुख्य कार्यपालक पदाधिकारी, SIDHKOFED',
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
        nameHi: entry.nameHi,
        govtRoleEn: entry.govtRoleEn,
        govtRoleHi: entry.govtRoleHi,
        sidhkofedRoleEn: entry.sidhkofedRoleEn,
        sidhkofedRoleHi: entry.sidhkofedRoleHi,
        photoMediaId: null,
        displayOrder: entry.displayOrder,
        publicationState: 'published',
        publishedAt: now,
      },
    });
  }
  console.log(`  ✓ leadership defaults: ensured ${LEADERSHIP_DEFAULTS.length} entries exist`);
}
