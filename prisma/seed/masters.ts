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

type NameRow = { nameEn: string; nameHi?: string; displayOrder?: number };

/** Upsert a batch of name-based masters (by slug) for a given delegate. */
async function seedNameMaster(
  label: string,
  rows: NameRow[],
  upsert: (row: NameRow & { slug: string }) => Promise<unknown>,
): Promise<void> {
  for (const [i, row] of rows.entries()) {
    await upsert({ ...row, slug: slugify(row.nameEn), displayOrder: row.displayOrder ?? i + 1 });
  }
  console.log(`  ✓ ${label}: ${rows.length}`);
}

const EVENT_TYPES: NameRow[] = [
  { nameEn: 'Training' }, { nameEn: 'Workshop' }, { nameEn: 'Meeting' }, { nameEn: 'MoU Signing' },
  { nameEn: 'Exposure Visit' }, { nameEn: 'Field Visit' }, { nameEn: 'Conference' },
  { nameEn: 'Awareness Programme' }, { nameEn: 'Other Institutional Activity' },
];

const TRAINING_TYPES: NameRow[] = [
  { nameEn: 'Skill Development' }, { nameEn: 'Capacity Building' }, { nameEn: 'Orientation' },
  { nameEn: 'Refresher' }, { nameEn: 'Awareness' },
];

const COMMODITIES: NameRow[] = [
  { nameEn: 'Lac', nameHi: 'लाख' }, { nameEn: 'Honey', nameHi: 'शहद' }, { nameEn: 'Ragi / Millets', nameHi: 'रागी / मिलेट्स' },
  { nameEn: 'Sal Seed', nameHi: 'साल बीज' }, { nameEn: 'Karanj', nameHi: 'करंज' }, { nameEn: 'Tamarind', nameHi: 'इमली' },
];

const INSTITUTION_TYPES: NameRow[] = [
  { nameEn: 'Government Department' }, { nameEn: 'Training Institution' }, { nameEn: 'University' },
  { nameEn: 'NGO' }, { nameEn: 'Corporate Buyer' }, { nameEn: 'Financial Institution' },
  { nameEn: 'Technical Agency' }, { nameEn: 'Cooperative Organization' }, { nameEn: 'Other Partner' },
  { nameEn: 'District Cooperative Union', nameHi: 'जिला सहकारी संघ' },
  { nameEn: 'Cooperative Federation',     nameHi: 'सहकारी महासंघ' },
];

const DOCUMENT_TYPES: NameRow[] = [
  { nameEn: 'Notice' }, { nameEn: 'Circular' }, { nameEn: 'Office Order' }, { nameEn: 'MoU' },
  { nameEn: 'Report' }, { nameEn: 'Policy' }, { nameEn: 'Guideline' }, { nameEn: 'SOP' },
  { nameEn: 'Training Material' }, { nameEn: 'Form' }, { nameEn: 'Publication' }, { nameEn: 'Other' },
];

const KNOWLEDGE_CATEGORIES: NameRow[] = [
  { nameEn: 'Acts and Rules' }, { nameEn: 'Bye-laws' }, { nameEn: 'Policies and Guidelines' },
  { nameEn: 'SOPs and Manuals' }, { nameEn: 'Training Resources' }, { nameEn: 'Research and Reports' },
  { nameEn: 'Publications' }, { nameEn: 'Forms and Formats' },
];

const COMMUNICATION_TYPES: NameRow[] = [
  { nameEn: 'Notice' }, { nameEn: 'Circular' }, { nameEn: 'Office Order' },
  { nameEn: 'Notification' }, { nameEn: 'Advisory' }, { nameEn: 'Public Announcement' },
];

const TENDER_TYPES: NameRow[] = [
  { nameEn: 'Goods' }, { nameEn: 'Works' }, { nameEn: 'Services' }, { nameEn: 'Consultancy' },
];

const PROCUREMENT_UPDATE_TYPES: NameRow[] = [
  { nameEn: 'Procurement Rate' }, { nameEn: 'Procurement Announcement' }, { nameEn: 'Procurement Schedule' },
  { nameEn: 'Procurement Centre Update' }, { nameEn: 'Trade Opportunity' }, { nameEn: 'Procurement Achievement' },
];

const FAQ_CATEGORIES: NameRow[] = [
  { nameEn: 'General' }, { nameEn: 'Membership' }, { nameEn: 'Training' },
  { nameEn: 'Procurement' }, { nameEn: 'Schemes' }, { nameEn: 'Digital Services' },
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

  await seedNameMaster('event types', EVENT_TYPES, (r) =>
    prisma.eventType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('training types', TRAINING_TYPES, (r) =>
    prisma.trainingType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('commodities', COMMODITIES, (r) =>
    prisma.commodity.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, nameHi: r.nameHi ?? null, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('institution types', INSTITUTION_TYPES, (r) =>
    prisma.institutionType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('document types', DOCUMENT_TYPES, (r) =>
    prisma.documentType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('knowledge categories', KNOWLEDGE_CATEGORIES, (r) =>
    prisma.knowledgeCategory.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('communication types', COMMUNICATION_TYPES, (r) =>
    prisma.communicationType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('tender types', TENDER_TYPES, (r) =>
    prisma.tenderType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('procurement update types', PROCUREMENT_UPDATE_TYPES, (r) =>
    prisma.procurementUpdateType.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
  await seedNameMaster('faq categories', FAQ_CATEGORIES, (r) =>
    prisma.faqCategory.upsert({ where: { slug: r.slug }, update: { nameEn: r.nameEn, displayOrder: r.displayOrder }, create: r }));
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
