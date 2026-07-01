/**
 * Seeds the 24 District Union institutions and their aggregate membership records,
 * plus the SIDHKOFED apex membership record. Idempotent — all rows are upserted
 * by slug.
 *
 * Primary count  = total LAMPS / PACS in the district (Table 1, all 24 districts).
 * Nominal count  = FPOs, SHGs and other non-shareholder members (Table 2).
 * Reporting period = "Cumulative" — the catch-all baseline period.
 *
 * Data source: SIDHKOFED district-wise LAMPS/PACS and membership tables (2025–2026).
 */
import { PrismaClient } from '@prisma/client';
import { slugify } from '@/utils/slug';

interface DuRow {
  nameEn: string;
  nameHi: string;
  districtSlug: string;
  primary: number;
  nominal: number;
  order: number;
}

const DU_ROWS: DuRow[] = [
  { nameEn: 'District Union Bokaro',              nameHi: 'जिला संघ बोकारो',             districtSlug: 'bokaro',              primary: 253, nominal:  6, order:  1 },
  { nameEn: 'District Union Chatra',              nameHi: 'जिला संघ चतरा',               districtSlug: 'chatra',              primary: 154, nominal:  0, order:  2 },
  { nameEn: 'District Union Deoghar',             nameHi: 'जिला संघ देवघर',              districtSlug: 'deoghar',             primary: 198, nominal:  0, order:  3 },
  { nameEn: 'District Union Dhanbad',             nameHi: 'जिला संघ धनबाद',              districtSlug: 'dhanbad',             primary: 257, nominal:  0, order:  4 },
  { nameEn: 'District Union Dumka',               nameHi: 'जिला संघ दुमका',              districtSlug: 'dumka',               primary: 206, nominal:  0, order:  5 },
  { nameEn: 'District Union East Singhbhum',      nameHi: 'जिला संघ पूर्वी सिंहभूम',    districtSlug: 'east-singhbhum',      primary: 232, nominal: 40, order:  6 },
  { nameEn: 'District Union Garhwa',              nameHi: 'जिला संघ गढ़वा',              districtSlug: 'garhwa',              primary: 195, nominal:  1, order:  7 },
  { nameEn: 'District Union Giridih',             nameHi: 'जिला संघ गिरिडीह',            districtSlug: 'giridih',             primary: 358, nominal:  4, order:  8 },
  { nameEn: 'District Union Godda',               nameHi: 'जिला संघ गोड्डा',             districtSlug: 'godda',               primary: 203, nominal:  0, order:  9 },
  { nameEn: 'District Union Gumla',               nameHi: 'जिला संघ गुमला',              districtSlug: 'gumla',               primary: 160, nominal:  0, order: 10 },
  { nameEn: 'District Union Hazaribagh',          nameHi: 'जिला संघ हजारीबाग',           districtSlug: 'hazaribagh',          primary: 257, nominal:  0, order: 11 },
  { nameEn: 'District Union Jamtara',             nameHi: 'जिला संघ जामताड़ा',            districtSlug: 'jamtara',             primary: 119, nominal:  0, order: 12 },
  { nameEn: 'District Union Khunti',              nameHi: 'जिला संघ खूंटी',              districtSlug: 'khunti',              primary:  87, nominal:  0, order: 13 },
  { nameEn: 'District Union Koderma',             nameHi: 'जिला संघ कोडरमा',             districtSlug: 'koderma',             primary: 111, nominal:  0, order: 14 },
  { nameEn: 'District Union Latehar',             nameHi: 'जिला संघ लातेहार',            districtSlug: 'latehar',             primary: 116, nominal:  3, order: 15 },
  { nameEn: 'District Union Lohardaga',           nameHi: 'जिला संघ लोहरदगा',            districtSlug: 'lohardaga',           primary:  66, nominal:  4, order: 16 },
  { nameEn: 'District Union Pakur',               nameHi: 'जिला संघ पाकुड़',              districtSlug: 'pakur',               primary: 129, nominal:  0, order: 17 },
  { nameEn: 'District Union Palamu',              nameHi: 'जिला संघ पलामू',              districtSlug: 'palamu',              primary: 285, nominal:  0, order: 18 },
  { nameEn: 'District Union Ramgarh',             nameHi: 'जिला संघ रामगढ़',             districtSlug: 'ramgarh',             primary: 143, nominal:  0, order: 19 },
  { nameEn: 'District Union Ranchi',              nameHi: 'जिला संघ रांची',              districtSlug: 'ranchi',              primary: 306, nominal:  0, order: 20 },
  { nameEn: 'District Union Sahibganj',           nameHi: 'जिला संघ साहिबगंज',           districtSlug: 'sahibganj',           primary: 168, nominal: 21, order: 21 },
  { nameEn: 'District Union Seraikela Kharsawan', nameHi: 'जिला संघ सरायकेला खरसावां',   districtSlug: 'seraikela-kharsawan', primary: 138, nominal:  3, order: 22 },
  { nameEn: 'District Union Simdega',             nameHi: 'जिला संघ सिमडेगा',            districtSlug: 'simdega',             primary:  95, nominal:  0, order: 23 },
  { nameEn: 'District Union West Singhbhum',      nameHi: 'जिला संघ पश्चिमी सिंहभूम',   districtSlug: 'west-singhbhum',      primary: 218, nominal:  5, order: 24 },
];

export async function seedMemberships(prisma: PrismaClient): Promise<void> {
  console.log('Seeding membership institutions and aggregate records (idempotent)…');

  // ── Lookup institution types (seeded by masters) ─────────────────────────────
  const duType = await prisma.institutionType.findUniqueOrThrow({
    where: { slug: 'district-cooperative-union' },
  });
  const fedType = await prisma.institutionType.findUniqueOrThrow({
    where: { slug: 'cooperative-federation' },
  });

  // ── Lookup cumulative reporting period (seeded by masters) ───────────────────
  const cumulativePeriod = await prisma.reportingPeriod.findUniqueOrThrow({
    where: { slug: 'cumulative' },
  });

  const NOW = new Date();

  // ── SIDHKOFED apex institution ───────────────────────────────────────────────
  const sidhkofedInstitution = await prisma.institution.upsert({
    where: { slug: 'sidhkofed' },
    update: {
      nameEn: 'SIDHKOFED',
      nameHi: 'सिद्धकोफेड',
      institutionTypeId: fedType.id,
    },
    create: {
      slug: 'sidhkofed',
      nameEn: 'SIDHKOFED',
      nameHi: 'सिद्धकोफेड',
      institutionTypeId: fedType.id,
      publicationState: 'published',
      publicVisibility: true,
      publishedAt: NOW,
      displayOrder: 0,
    },
  });

  // ── SIDHKOFED apex membership record — 24 primary (DUs) + 12 nominal ────────
  await prisma.institutionalMembership.upsert({
    where: { slug: 'sidhkofed-apex' },
    update: { primaryMemberCount: 24, nominalMemberCount: 12 },
    create: {
      slug: 'sidhkofed-apex',
      institutionId: sidhkofedInstitution.id,
      membershipLevel: 'sidhkofed',
      membershipType: 'primary',
      reportingPeriodId: cumulativePeriod.id,
      primaryMemberCount: 24,
      nominalMemberCount: 12,
      status: 'active',
      publicationState: 'published',
      publicVisibility: true,
      publishedAt: NOW,
      displayOrder: 0,
    },
  });

  // ── 24 District Union institutions + one aggregate membership record each ────
  let seeded = 0;
  for (const row of DU_ROWS) {
    const district = await prisma.district.findUnique({ where: { slug: row.districtSlug } });
    if (!district) {
      console.warn(`  ⚠  District not found: ${row.districtSlug} — skipping ${row.nameEn}`);
      continue;
    }

    const instSlug = slugify(row.nameEn); // district-union-bokaro, etc.
    const institution = await prisma.institution.upsert({
      where: { slug: instSlug },
      update: {
        nameEn: row.nameEn,
        nameHi: row.nameHi,
        institutionTypeId: duType.id,
        districtId: district.id,
        displayOrder: row.order,
      },
      create: {
        slug: instSlug,
        nameEn: row.nameEn,
        nameHi: row.nameHi,
        institutionTypeId: duType.id,
        districtId: district.id,
        publicationState: 'published',
        publicVisibility: true,
        publishedAt: NOW,
        displayOrder: row.order,
      },
    });

    const membershipSlug = `du-${row.districtSlug}`;
    await prisma.institutionalMembership.upsert({
      where: { slug: membershipSlug },
      update: {
        institutionId: institution.id,
        districtId: district.id,
        primaryMemberCount: row.primary,
        nominalMemberCount: row.nominal,
        displayOrder: row.order,
      },
      create: {
        slug: membershipSlug,
        institutionId: institution.id,
        membershipLevel: 'district_union',
        membershipType: 'primary',
        districtId: district.id,
        reportingPeriodId: cumulativePeriod.id,
        primaryMemberCount: row.primary,
        nominalMemberCount: row.nominal,
        status: 'active',
        publicationState: 'published',
        publicVisibility: true,
        publishedAt: NOW,
        displayOrder: row.order,
      },
    });

    seeded++;
  }

  console.log(`  ✓ SIDHKOFED apex institution + membership record`);
  console.log(`  ✓ district union institutions: ${seeded}`);
  console.log(`  ✓ district union membership records: ${seeded}`);
}
