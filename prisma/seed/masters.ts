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
  { nameEn: 'Government Department', nameHi: 'सरकारी विभाग' },
  { nameEn: 'Training Institution', nameHi: 'प्रशिक्षण संस्था' },
  { nameEn: 'University', nameHi: 'विश्वविद्यालय' },
  { nameEn: 'NGO', nameHi: 'गैर-सरकारी संगठन' },
  { nameEn: 'Corporate Buyer', nameHi: 'कॉर्पोरेट खरीदार' },
  { nameEn: 'Financial Institution', nameHi: 'वित्तीय संस्था' },
  { nameEn: 'Technical Agency', nameHi: 'तकनीकी एजेंसी' },
  { nameEn: 'Cooperative Organization', nameHi: 'सहकारी संगठन' },
  { nameEn: 'Other Partner', nameHi: 'अन्य साझेदार' },
  { nameEn: 'District Cooperative Union', nameHi: 'जिला सहकारी संघ' },
  { nameEn: 'Cooperative Federation',     nameHi: 'सहकारी महासंघ' },
];

const TENDER_TYPES: NameRow[] = [
  { nameEn: 'Goods', nameHi: 'वस्तुएँ' },
  { nameEn: 'Works', nameHi: 'कार्य' },
  { nameEn: 'Services', nameHi: 'सेवाएँ' },
  { nameEn: 'Consultancy', nameHi: 'परामर्श सेवा' },
];

const PROCUREMENT_UPDATE_CATEGORIES: NameRow[] = [
  { nameEn: 'Rates & Trade', nameHi: 'दरें एवं व्यापार' },
  { nameEn: 'Announcements & Schedules', nameHi: 'घोषणाएँ एवं कार्यक्रम' },
  { nameEn: 'Achievements', nameHi: 'उपलब्धियाँ' },
];

const PROCUREMENT_UPDATE_TYPES: (NameRow & { category: string })[] = [
  { nameEn: 'Procurement Rate', nameHi: 'खरीद दर', category: 'Rates & Trade' },
  { nameEn: 'Procurement Announcement', nameHi: 'खरीद घोषणा', category: 'Announcements & Schedules' },
  { nameEn: 'Procurement Schedule', nameHi: 'खरीद कार्यक्रम', category: 'Announcements & Schedules' },
  { nameEn: 'Procurement Centre Update', nameHi: 'खरीद केंद्र अद्यतन', category: 'Announcements & Schedules' },
  { nameEn: 'Trade Opportunity', nameHi: 'व्यापार अवसर', category: 'Rates & Trade' },
  { nameEn: 'Procurement Achievement', nameHi: 'खरीद उपलब्धि', category: 'Achievements' },
];

const ENQUIRY_TYPES: NameRow[] = [
  { nameEn: 'General Enquiry', nameHi: 'सामान्य पूछताछ' },
  { nameEn: 'Buyer Enquiry', nameHi: 'खरीदार पूछताछ' },
  { nameEn: 'Seller Enquiry', nameHi: 'विक्रेता पूछताछ' },
  { nameEn: 'Storage / Godown Enquiry', nameHi: 'भंडारण / गोदाम पूछताछ' },
  { nameEn: 'Membership Enquiry', nameHi: 'सदस्यता पूछताछ' },
  { nameEn: 'Partnership Enquiry', nameHi: 'साझेदारी पूछताछ' },
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
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, category: r.category, isActive: true },
      create: { ...r, isActive: true },
    }));
  await seedNameMaster('institution types', INSTITUTION_TYPES, (r) =>
    prisma.institutionType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, isActive: true }, create: { ...r, isActive: true } }));
  await seedNameMaster('tender types', TENDER_TYPES, (r) =>
    prisma.tenderType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, isActive: true }, create: { ...r, isActive: true } }));
  await seedNameMaster('procurement update categories', PROCUREMENT_UPDATE_CATEGORIES, (r) =>
    prisma.procurementUpdateCategory.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, isActive: true },
      create: { ...r, isActive: true },
    }));
  const procurementUpdateCategories = await prisma.procurementUpdateCategory.findMany({ select: { id: true, nameEn: true } });
  const procurementUpdateCategoryByName = new Map(procurementUpdateCategories.map((c) => [c.nameEn, c.id]));
  await seedNameMaster('procurement update types', PROCUREMENT_UPDATE_TYPES, (r) => {
    const procurementUpdateCategoryId = procurementUpdateCategoryByName.get(r.category);
    if (!procurementUpdateCategoryId) throw new Error(`Unknown procurement update category: ${r.category}`);
    return prisma.procurementUpdateType.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, procurementUpdateCategoryId, isActive: true },
      create: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, slug: r.slug, displayOrder: r.displayOrder, procurementUpdateCategoryId, isActive: true },
    });
  });
  await seedNameMaster('enquiry types', ENQUIRY_TYPES, (r) =>
    prisma.enquiryType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder, isActive: true }, create: { ...r, isActive: true } }));

  // Districts, then all 264 official blocks.
  await seedNameMaster('districts', DISTRICTS, (r) =>
    prisma.district.upsert({
      where: { slug: r.slug },
      update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, state: 'Jharkhand', displayOrder: r.displayOrder, isActive: true },
      create: { ...r, state: 'Jharkhand', isActive: true },
    }));
  await seedBlocks(prisma);

  // Financial years (Indian FY: 1 Apr – 31 Mar).
  const FINANCIAL_YEARS = [
    { label: 'All Financial Years', startDate: new Date('2000-01-01'), endDate: new Date('2099-12-31'), isAllYearsAggregate: true },
    { label: '2021-2022', startDate: new Date('2021-11-18'), endDate: new Date('2022-03-31'), isAllYearsAggregate: false },
    { label: '2022-2023', startDate: new Date('2022-04-01'), endDate: new Date('2023-03-31'), isAllYearsAggregate: false },
    { label: '2023-2024', startDate: new Date('2023-04-01'), endDate: new Date('2024-03-31'), isAllYearsAggregate: false },
    { label: '2024-2025', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31'), isAllYearsAggregate: false },
    { label: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isAllYearsAggregate: false },
    { label: '2026-2027', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isAllYearsAggregate: false },
  ];
  for (const fy of FINANCIAL_YEARS) {
    await prisma.financialYear.upsert({
      where: { label: fy.label },
      update: { startDate: fy.startDate, endDate: fy.endDate, isActive: true, isAllYearsAggregate: fy.isAllYearsAggregate },
      create: { ...fy, isActive: true },
    });
  }
  console.log(`  ✓ financial years: ${FINANCIAL_YEARS.length}`);

  const currentFy = await prisma.financialYear.findUnique({ where: { label: '2025-2026' } });
  const REPORTING_PERIODS = [
    { nameEn: 'Cumulative', nameHi: 'संचयी', slug: 'cumulative', periodType: 'cumulative' as const, financialYearId: null, calendarYear: null, startDate: new Date('2020-04-01'), endDate: new Date('2030-03-31') },
    { nameEn: 'FY 2025-2026', nameHi: 'वित्तीय वर्ष 2025-2026', slug: 'fy-2025-2026', periodType: 'financial_year' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    { nameEn: 'Calendar Year 2025', nameHi: 'कैलेंडर वर्ष 2025', slug: 'calendar-year-2025', periodType: 'calendar_year' as const, financialYearId: null, calendarYear: 2025, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') },
    { nameEn: 'April 2025', nameHi: 'अप्रैल 2025', slug: 'april-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-04-01'), endDate: new Date('2025-04-30') },
    { nameEn: 'May 2025', nameHi: 'मई 2025', slug: 'may-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-05-01'), endDate: new Date('2025-05-31') },
    { nameEn: 'June 2025', nameHi: 'जून 2025', slug: 'june-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-06-01'), endDate: new Date('2025-06-30') },
    { nameEn: 'July 2025', nameHi: 'जुलाई 2025', slug: 'july-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-07-01'), endDate: new Date('2025-07-31') },
    { nameEn: 'August 2025', nameHi: 'अगस्त 2025', slug: 'august-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-08-01'), endDate: new Date('2025-08-31') },
    { nameEn: 'September 2025', nameHi: 'सितंबर 2025', slug: 'september-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-09-01'), endDate: new Date('2025-09-30') },
    { nameEn: 'October 2025', nameHi: 'अक्टूबर 2025', slug: 'october-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-10-01'), endDate: new Date('2025-10-31') },
    { nameEn: 'November 2025', nameHi: 'नवंबर 2025', slug: 'november-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-11-01'), endDate: new Date('2025-11-30') },
    { nameEn: 'December 2025', nameHi: 'दिसंबर 2025', slug: 'december-2025', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2025-12-01'), endDate: new Date('2025-12-31') },
    { nameEn: 'January 2026', nameHi: 'जनवरी 2026', slug: 'january-2026', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') },
    { nameEn: 'February 2026', nameHi: 'फ़रवरी 2026', slug: 'february-2026', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28') },
    { nameEn: 'March 2026', nameHi: 'मार्च 2026', slug: 'march-2026', periodType: 'month' as const, financialYearId: currentFy?.id ?? null, calendarYear: null, startDate: new Date('2026-03-01'), endDate: new Date('2026-03-31') },
  ];
  for (const rp of REPORTING_PERIODS) {
    await prisma.reportingPeriod.upsert({
      where: { slug: rp.slug },
      update: { ...rp, isActive: true },
      create: { ...rp, isActive: true },
    });
  }
  console.log(`  ✓ reporting periods: ${REPORTING_PERIODS.length}`);

  console.log('Master data seed complete.');
}
