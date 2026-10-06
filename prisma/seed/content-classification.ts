import { PrismaClient } from '@prisma/client';

// Slugs are persistent identities: retain them when labels change.
export const eventGroups = [
  ['trainings', 'Capacity Building & Exposure Visits', 'क्षमता निर्माण एवं अनुभव भ्रमण', [
    ['training', 'Training', 'प्रशिक्षण'], ['capacity-building', 'Capacity Building', 'क्षमता निर्माण'],
    ['field-visit', 'Field Visit', 'क्षेत्र भ्रमण'], ['exposure-visit', 'Exposure Visit', 'परिचयात्मक भ्रमण'],
  ]],
  ['workshops-awareness', 'Workshops & Awareness Programmes', 'कार्यशाला एवं जागरूकता कार्यक्रम', [
    ['workshop', 'Workshop', 'कार्यशाला'], ['awareness-programme', 'Awareness Programme', 'जागरूकता कार्यक्रम'],
  ]],
  ['institutional-activities', 'Institutional Activities', 'संस्थागत गतिविधियाँ', [
    ['meeting', 'Meeting', 'बैठक'], ['mou-signing', 'MoU Signing', 'समझौता ज्ञापन हस्ताक्षर'],
    ['other-institutional-activity', 'Other Institutional Activity', 'अन्य संस्थागत गतिविधि'],
  ]],
  ['membership-drives', 'Membership Drives', 'सदस्यता अभियान', [
    ['membership-programme', 'Membership Programme', 'सदस्यता कार्यक्रम'],
  ]],
] as const;

export const knowledgeGroups = [
  ['acts-and-rules', 'Acts, Bye-laws and Taining Resources', 'अधिनियम, उपविधियाँ और प्रशिक्षण संसाधन', [
    ['acts', 'Acts', 'अधिनियम', 1], ['bye-laws', 'Bye-Laws', 'उपविधियाँ', 2],
    ['training-material', 'Training Material', 'प्रशिक्षण सामग्री', 4],
  ]],
  ['training-resources', 'Forms and Formats', 'प्रपत्र और प्रारूप', [
    ['form', 'Forms', 'प्रपत्र', 3], ['manuals', 'Manuals', 'पुस्तिकाएँ', 5],
    ['guideline', 'Guidelines', 'दिशानिर्देश', 6], ['formats', 'Formats', 'प्रारूप', 7],
  ]],
  ['research-and-reports', 'Research and Reports', 'अनुसंधान और प्रतिवेदन', [
    ['gap-study', 'Gap Study', 'अंतराल अध्ययन', 8], ['research-paper', 'Research Paper', 'शोध पत्र', 9],
    ['report', 'Reports', 'प्रतिवेदन', 10], ['articles', 'Articles', 'लेख', 11],
  ]],
] as const;

export const communicationGroups = [
  ['notice', 'Notice', 'सूचना'], ['office-order', 'Office Order', 'कार्यालय आदेश'],
  ['public-announcement', 'Public Announcement', 'सार्वजनिक घोषणा'],
] as const;

/** Refresh only the approved classification masters. Retire legacy rows without deleting references. */
export async function seedContentClassification(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let eventOrder = 0;
    for (const [index, [slug, nameEn, nameHi, children]] of eventGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.eventCategory.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      for (const [childSlug, childName, childNameHi] of children) {
        const child = { nameEn: childName, nameHi: childNameHi, eventCategoryId: parent.id, displayOrder: ++eventOrder, isActive: true };
        await tx.eventType.upsert({ where: { slug: childSlug }, create: { slug: childSlug, ...child }, update: child });
      }
    }
    for (const [index, [slug, nameEn, nameHi, children]] of knowledgeGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.knowledgeCategory.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      for (const [childSlug, childName, childNameHi, displayOrder] of children) {
        const child = { nameEn: childName, nameHi: childNameHi, knowledgeCategoryId: parent.id, communicationTypeId: null, displayOrder, isActive: true };
        await tx.documentType.upsert({ where: { slug: childSlug }, create: { slug: childSlug, ...child }, update: child });
      }
    }
    for (const [index, [slug, nameEn, nameHi]] of communicationGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.communicationType.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      const child = { nameEn, nameHi, knowledgeCategoryId: null, communicationTypeId: parent.id, displayOrder: 12 + index, isActive: true };
      await tx.documentType.upsert({ where: { slug }, create: { slug, ...child }, update: child });
    }
    // Explicit retirement lists leave unrelated, manually-created masters alone.
    await tx.eventType.updateMany({ where: { slug: 'conference' }, data: { isActive: false } });
    await tx.documentType.updateMany({ where: { slug: { in: ['circular', 'mou', 'policy', 'sop', 'publication', 'other'] } }, data: { isActive: false } });
    await tx.knowledgeCategory.updateMany({ where: { slug: { in: ['bye-laws', 'policies-and-guidelines', 'sops-and-manuals', 'publications', 'forms-and-formats'] } }, data: { isActive: false } });
    await tx.communicationType.updateMany({ where: { slug: { in: ['circular', 'notification', 'advisory'] } }, data: { isActive: false } });
  }, { timeout: 30000 });
}
