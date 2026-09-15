import { PrismaClient } from '@prisma/client';

// Slugs are persistent identities: retain them when labels change.
export const eventGroups = [
  ['trainings', 'Capacity Building & Exposure Visits', 'क्षमता निर्माण एवं अनुभव भ्रमण', [
    ['training', 'Training'], ['capacity-building', 'Capacity Building'],
    ['field-visit', 'Field Visit'], ['exposure-visit', 'Exposure Visit'],
  ]],
  ['workshops-awareness', 'Workshops & Awareness Programmes', 'कार्यशाला एवं जागरूकता कार्यक्रम', [
    ['workshop', 'Workshop'], ['awareness-programme', 'Awareness Programme'],
  ]],
  ['institutional-activities', 'Institutional Activities', 'संस्थागत गतिविधियाँ', [
    ['meeting', 'Meeting'], ['mou-signing', 'MoU Signing'], ['other-institutional-activity', 'Other Institutional Activity'],
  ]],
  ['membership-drives', 'Membership Drives', 'सदस्यता अभियान', [['membership-programme', 'Membership Programme']]],
] as const;

export const knowledgeGroups = [
  ['acts-and-rules', 'Acts, Bye-laws and Forms', [['acts', 'Acts'], ['bye-laws', 'Bye-Laws'], ['form', 'Forms']]],
  ['training-resources', 'Training Resources and Formats', [
    ['training-material', 'Training Material'], ['manuals', 'Manuals'], ['guideline', 'Guidelines'], ['formats', 'Formats'],
  ]],
  ['research-and-reports', 'Research and Reports', [
    ['gap-study', 'Gap Study'], ['research-paper', 'Research Paper'], ['report', 'Reports'], ['articles', 'Articles'],
  ]],
] as const;

export const communicationGroups = [
  ['notice', 'Notice'], ['office-order', 'Office Order'], ['public-announcement', 'Public Announcement'],
] as const;

/** Refresh only the approved classification masters. Retire legacy rows without deleting references. */
export async function seedContentClassification(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let eventOrder = 0;
    for (const [index, [slug, nameEn, nameHi, children]] of eventGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.eventCategory.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      for (const [childSlug, childName] of children) {
        const child = { nameEn: childName, eventCategoryId: parent.id, displayOrder: ++eventOrder, isActive: true };
        await tx.eventType.upsert({ where: { slug: childSlug }, create: { slug: childSlug, ...child }, update: child });
      }
    }
    let documentOrder = 0;
    for (const [index, [slug, nameEn, children]] of knowledgeGroups.entries()) {
      const data = { nameEn, displayOrder: index + 1, isActive: true };
      const parent = await tx.knowledgeCategory.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      for (const [childSlug, childName] of children) {
        const child = { nameEn: childName, knowledgeCategoryId: parent.id, communicationTypeId: null, displayOrder: ++documentOrder, isActive: true };
        await tx.documentType.upsert({ where: { slug: childSlug }, create: { slug: childSlug, ...child }, update: child });
      }
    }
    for (const [index, [slug, nameEn]] of communicationGroups.entries()) {
      const data = { nameEn, displayOrder: index + 1, isActive: true };
      const parent = await tx.communicationType.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      const child = { nameEn, knowledgeCategoryId: null, communicationTypeId: parent.id, displayOrder: ++documentOrder, isActive: true };
      await tx.documentType.upsert({ where: { slug }, create: { slug, ...child }, update: child });
    }
    // Explicit retirement lists leave unrelated, manually-created masters alone.
    await tx.eventType.updateMany({ where: { slug: 'conference' }, data: { isActive: false } });
    await tx.documentType.updateMany({ where: { slug: { in: ['circular', 'mou', 'policy', 'sop', 'publication', 'other'] } }, data: { isActive: false } });
    await tx.knowledgeCategory.updateMany({ where: { slug: { in: ['bye-laws', 'policies-and-guidelines', 'sops-and-manuals', 'publications', 'forms-and-formats'] } }, data: { isActive: false } });
    await tx.communicationType.updateMany({ where: { slug: { in: ['circular', 'notification', 'advisory'] } }, data: { isActive: false } });
  }, { timeout: 30000 });
}
