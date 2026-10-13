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
  ['policies-guidelines-and-training-resources', 'Policies, Guidelines & Training Resources', 'नीतियाँ, दिशानिर्देश और प्रशिक्षण संसाधन', [
    ['acts', 'Acts', 'अधिनियम', 1], ['bye-laws', 'Bye-Laws', 'उपविधियाँ', 2],
    ['training-material', 'Training Resources', 'प्रशिक्षण संसाधन', 4], ['manuals', 'Manuals', 'पुस्तिकाएँ', 5],
    ['guideline', 'Guidelines', 'दिशानिर्देश', 6], ['policy', 'Policy', 'नीति', 15],
  ]],
  ['forms-and-formats', 'Forms and Formats', 'प्रपत्र और प्रारूप', [
    ['form', 'Forms', 'प्रपत्र', 3], ['formats', 'Formats', 'प्रारूप', 7],
    ['membership-form', 'Membership Form', 'सदस्यता फार्म', 17],
  ]],
  ['research-and-reports', 'Research and Reports', 'अनुसंधान और रिपोर्ट', [
    ['gap-study', 'Gap Study', 'अंतराल अध्ययन', 8], ['research-paper', 'Research Paper', 'शोध पत्र', 9],
    ['report', 'Reports', 'प्रतिवेदन', 10], ['articles', 'Articles', 'लेख', 11],
    ['annual-reports', 'Annual Reports', 'वार्षिक रिपोर्ट', 16],
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
    // name_en is unique: a retired/legacy row may still hold a name a target category now uses
    // (e.g. slug training-resources once carried "Forms and Formats"). Retire and rename it first.
    const targetSlugs = knowledgeGroups.map(([slug]) => slug as string);
    for (const [slug, nameEn] of knowledgeGroups) {
      const clash = await tx.knowledgeCategory.findFirst({ where: { nameEn, slug: { not: slug } } });
      if (clash && !targetSlugs.includes(clash.slug)) {
        await tx.knowledgeCategory.update({ where: { id: clash.id }, data: { nameEn: `${nameEn} (retired: ${clash.slug})`, isActive: false } });
      }
    }
    for (const [index, [slug, nameEn, nameHi, children]] of knowledgeGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.knowledgeCategory.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      for (const [childSlug, childName, childNameHi, displayOrder] of children) {
        const child = { nameEn: childName, nameHi: childNameHi, knowledgeCategoryId: parent.id, communicationTypeId: null, displayOrder, isActive: true };
        await tx.documentType.upsert({ where: { slug: childSlug }, create: { slug: childSlug, ...child }, update: child });
      }
      // Documents carry a denormalised category: follow their type if it was re-parented.
      await tx.document.updateMany({
        where: { documentType: { knowledgeCategoryId: parent.id }, knowledgeCategoryId: { not: null, notIn: [parent.id] } },
        data: { knowledgeCategoryId: parent.id },
      });
    }
    for (const [index, [slug, nameEn, nameHi]] of communicationGroups.entries()) {
      const data = { nameEn, nameHi, displayOrder: index + 1, isActive: true };
      const parent = await tx.communicationType.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      const child = { nameEn, nameHi, knowledgeCategoryId: null, communicationTypeId: parent.id, displayOrder: 12 + index, isActive: true };
      await tx.documentType.upsert({ where: { slug }, create: { slug, ...child }, update: child });
    }
    // Explicit retirement lists leave unrelated, manually-created masters alone.
    await tx.eventType.updateMany({ where: { slug: 'conference' }, data: { isActive: false } });
    await tx.documentType.updateMany({ where: { slug: { in: ['circular', 'mou', 'sop', 'publication', 'other'] } }, data: { isActive: false } });
    await tx.knowledgeCategory.updateMany({ where: { slug: { in: ['acts-and-rules', 'bye-laws', 'sops-and-manuals', 'publications', 'policies-and-guidelines', 'training-resources'] } }, data: { isActive: false } });
    await tx.communicationType.updateMany({ where: { slug: { in: ['circular', 'notification', 'advisory'] } }, data: { isActive: false } });
  }, { timeout: 30000 });
}
