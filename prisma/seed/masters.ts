/**
 * Idempotent master-data seeder (TASK 23). Seeds the reusable lookup tables from the
 * canonical lists in the CMS requirements (codex §4/§6) and schema Part 4. Safe to re-run:
 * every row is upserted by its natural key (slug / label / district+name composite).
 *
 * Districts cover all 24 Jharkhand districts; blocks seed a representative subset per the
 * "District and Block data seeded during setup" rule (the full official block list is loaded
 * from approved data later). Commodities, event/training/document/etc. types follow the
 * canonical enumerations. Run via `npm run db:seed` (after the masters migration applies).
 */
import { PrismaClient } from '@prisma/client';
import { slugify } from '@/utils/slug';
import { seedBlocks } from './blocks';
import { seedContentClassification } from './content-classification';

type NameRow = { nameEn: string; nameHi?: string; displayOrder?: number };

/** Upsert a batch of name-based masters (by slug) for a given delegate. */
async function seedNameMaster<T extends NameRow>(
  label: string,
  rows: T[],
  upsert: (row: T & { slug: string }) => Promise<unknown>,
): Promise<void> {
  for (const [i, row] of rows.entries()) {
    await upsert({ ...row, slug: slugify(row.nameEn), displayOrder: row.displayOrder ?? i + 1 });
  }
  console.log(`  ✓ ${label}: ${rows.length}`);
}


const COMMODITIES: (NameRow & { category: string })[] = [
  { nameEn: 'Lac', nameHi: 'लाख', category: 'Minor Forest Produce' },
  { nameEn: 'Honey', nameHi: 'शहद', category: 'Minor Forest Produce' },
  { nameEn: 'Ragi / Millets', nameHi: 'रागी / मिलेट्स', category: 'Agriculture' },
  { nameEn: 'Sal Seed', nameHi: 'साल बीज', category: 'Minor Forest Produce' },
  { nameEn: 'Karanj', nameHi: 'करंज', category: 'Minor Forest Produce' },
  { nameEn: 'Tamarind', nameHi: 'इमली', category: 'Minor Forest Produce' },
];

const INSTITUTION_TYPES: NameRow[] = [
  { nameEn: 'Government Department' }, { nameEn: 'Training Institution' }, { nameEn: 'University' },
  { nameEn: 'NGO' }, { nameEn: 'Corporate Buyer' }, { nameEn: 'Financial Institution' },
  { nameEn: 'Technical Agency' }, { nameEn: 'Cooperative Organization' }, { nameEn: 'Other Partner' },
  { nameEn: 'District Cooperative Union', nameHi: 'जिला सहकारी संघ' },
  { nameEn: 'Cooperative Federation',     nameHi: 'सहकारी महासंघ' },
];

const TENDER_TYPES: NameRow[] = [
  { nameEn: 'Goods' }, { nameEn: 'Works' }, { nameEn: 'Services' }, { nameEn: 'Consultancy' },
];

const PROCUREMENT_UPDATE_CATEGORIES: NameRow[] = [
  { nameEn: 'Rates & Trade', nameHi: 'दरें एवं व्यापार' },
  { nameEn: 'Announcements & Schedules', nameHi: 'घोषणाएँ एवं कार्यक्रम' },
  { nameEn: 'Achievements', nameHi: 'उपलब्धियाँ' },
];

const PROCUREMENT_UPDATE_TYPES: (NameRow & { category: string })[] = [
  { nameEn: 'Procurement Rate', category: 'Rates & Trade' },
  { nameEn: 'Procurement Announcement', category: 'Announcements & Schedules' },
  { nameEn: 'Procurement Schedule', category: 'Announcements & Schedules' },
  { nameEn: 'Procurement Centre Update', category: 'Announcements & Schedules' },
  { nameEn: 'Trade Opportunity', category: 'Rates & Trade' },
  { nameEn: 'Procurement Achievement', category: 'Achievements' },
];

const ENQUIRY_TYPES: NameRow[] = [
  { nameEn: 'General Enquiry' }, { nameEn: 'Buyer Enquiry' }, { nameEn: 'Seller Enquiry' },
  { nameEn: 'Storage / Godown Enquiry' }, { nameEn: 'Membership Enquiry' }, { nameEn: 'Partnership Enquiry' },
];

/** All 24 districts of Jharkhand (bilingual). */
const DISTRICTS: NameRow[] = [
  { nameEn: 'Bokaro',              nameHi: 'बोकारो' },
  { nameEn: 'Chatra',              nameHi: 'चतरा' },
  { nameEn: 'Deoghar',             nameHi: 'देवघर' },
  { nameEn: 'Dhanbad',             nameHi: 'धनबाद' },
  { nameEn: 'Dumka',               nameHi: 'दुमका' },
  { nameEn: 'East Singhbhum',      nameHi: 'पूर्वी सिंहभूम' },
  { nameEn: 'Garhwa',              nameHi: 'गढ़वा' },
  { nameEn: 'Giridih',             nameHi: 'गिरिडीह' },
  { nameEn: 'Godda',               nameHi: 'गोड्डा' },
  { nameEn: 'Gumla',               nameHi: 'गुमला' },
  { nameEn: 'Hazaribagh',          nameHi: 'हजारीबाग' },
  { nameEn: 'Jamtara',             nameHi: 'जामताड़ा' },
  { nameEn: 'Khunti',              nameHi: 'खूंटी' },
  { nameEn: 'Koderma',             nameHi: 'कोडरमा' },
  { nameEn: 'Latehar',             nameHi: 'लातेहार' },
  { nameEn: 'Lohardaga',           nameHi: 'लोहरदगा' },
  { nameEn: 'Pakur',               nameHi: 'पाकुड़' },
  { nameEn: 'Palamu',              nameHi: 'पलामू' },
  { nameEn: 'Ramgarh',             nameHi: 'रामगढ़' },
  { nameEn: 'Ranchi',              nameHi: 'रांची' },
  { nameEn: 'Sahibganj',           nameHi: 'साहिबगंज' },
  { nameEn: 'Seraikela Kharsawan', nameHi: 'सरायकेला खरसावां' },
  { nameEn: 'Simdega',             nameHi: 'सिमडेगा' },
  { nameEn: 'West Singhbhum',      nameHi: 'पश्चिमी सिंहभूम' },
];


export async function seedMasters(prisma: PrismaClient): Promise<void> {
  console.log('Seeding master data (idempotent)…');

  await seedContentClassification(prisma);
  await seedNameMaster('commodities', COMMODITIES, (r) =>
    prisma.commodity.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, category: r.category },
      create: r,
    }));
  await seedNameMaster('institution types', INSTITUTION_TYPES, (r) =>
    prisma.institutionType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('tender types', TENDER_TYPES, (r) =>
    prisma.tenderType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('procurement update categories', PROCUREMENT_UPDATE_CATEGORIES, (r) =>
    prisma.procurementUpdateCategory.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder },
      create: r,
    }));
  const procurementUpdateCategories = await prisma.procurementUpdateCategory.findMany({ select: { id: true, nameEn: true } });
  const procurementUpdateCategoryByName = new Map(procurementUpdateCategories.map((c) => [c.nameEn, c.id]));
  await seedNameMaster('procurement update types', PROCUREMENT_UPDATE_TYPES, (r) => {
    const procurementUpdateCategoryId = procurementUpdateCategoryByName.get(r.category);
    if (!procurementUpdateCategoryId) throw new Error(`Unknown procurement update category: ${r.category}`);
    return prisma.procurementUpdateType.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, displayOrder: r.displayOrder, procurementUpdateCategoryId },
      create: { nameEn: r.nameEn, slug: r.slug, displayOrder: r.displayOrder, procurementUpdateCategoryId },
    });
  });
  await seedNameMaster('enquiry types', ENQUIRY_TYPES, (r) =>
    prisma.enquiryType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));

  // Districts, then all 264 official blocks.
  await seedNameMaster('districts', DISTRICTS, (r) =>
    prisma.district.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder }, create: r }));
  await seedBlocks(prisma);

  // Financial years (Indian FY: 1 Apr – 31 Mar).
  const FINANCIAL_YEARS = [
    { label: '2024-2025', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31') },
    { label: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    { label: '2026-2027', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31') },
  ];
  for (const fy of FINANCIAL_YEARS) {
    await prisma.financialYear.upsert({ where: { label: fy.label }, update: { startDate: fy.startDate, endDate: fy.endDate }, create: fy });
  }
  console.log(`  ✓ financial years: ${FINANCIAL_YEARS.length}`);

  const currentFy = await prisma.financialYear.findUnique({ where: { label: '2025-2026' } });
  const REPORTING_PERIODS = [
    { nameEn: 'Cumulative', slug: 'cumulative', periodType: 'cumulative' as const, financialYearId: null, calendarYear: null, startDate: new Date('2020-04-01'), endDate: new Date('2030-03-31') },
    { nameEn: 'FY 2025-2026', slug: 'fy-2025-2026', periodType: 'financial_year' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    { nameEn: 'Calendar Year 2025', slug: 'calendar-year-2025', periodType: 'calendar_year' as const, financialYearId: null, calendarYear: 2025, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') },
    { nameEn: 'April 2025', slug: 'april-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-04-01'), endDate: new Date('2025-04-30') },
  ];
  for (const rp of REPORTING_PERIODS) {
    await prisma.reportingPeriod.upsert({ where: { slug: rp.slug }, update: { nameEn: rp.nameEn, financialYearId: rp.financialYearId }, create: rp });
  }
  console.log(`  ✓ reporting periods: ${REPORTING_PERIODS.length}`);

  console.log('Master data seed complete.');
}
