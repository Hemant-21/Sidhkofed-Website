/**
 * Deterministic, idempotent full-CMS fixture dataset.
 *
 * This is intentionally separate from `prisma db seed`: integration tests keep the
 * lightweight baseline while `db:fixtures:*` targets a guarded `*_seed` database.
 */
import { createHash } from 'node:crypto';
import { copyFile, link, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedBaseline } from './index';
import { SETTINGS_CATALOG, SETTING_KEYS, encodeForStorage } from '@/modules/settings/settings.catalog';

const prisma = new PrismaClient();
// Prisma's generated delegates are structurally safe here; `any` keeps this data-heavy
// fixture readable while runtime schema validation remains authoritative.
const db = prisma as any;
const NOW = new Date('2026-06-27T08:00:00.000Z');
const PAST = new Date('2026-01-15T08:00:00.000Z');
const FUTURE = new Date('2027-01-15T08:00:00.000Z');
const ASSET_ROOT = path.resolve('prisma/seed/assets');
const STORAGE_ROOT = path.resolve(process.env.FIXTURE_STORAGE_ROOT ?? 'storage/seed-fixtures');

function fixtureId(scope: string, value: string | number): string {
  const hex = createHash('sha256').update(`sidhkofed-fixture:${scope}:${value}`).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20).join('')}`;
}

function publication(i: number, total: number, homepageLimit = 0) {
  const archived = i === total - 1;
  const draft = i === total - 2;
  const privateRecord = i === total - 3;
  const scheduled = i === total - 4;
  const unpublished = i === total - 5;
  return {
    publicationState: archived ? 'archived' : draft ? 'draft' : unpublished ? 'unpublished' : 'published',
    publicVisibility: !privateRecord && !archived,
    publishStartAt: scheduled ? FUTURE : null,
    publishedAt: draft || unpublished ? null : PAST,
    archivedAt: archived ? NOW : null,
    highlightType: i === 0 ? 'featured' : i === 1 ? 'latest' : i === 2 ? 'important' : null,
    highlightStartAt: i < 3 ? PAST : null,
    highlightEndAt: i < 3 ? FUTURE : null,
    displayOrder: i + 1,
    showOnHomepage: i < homepageLimit,
  };
}

async function upsert(delegate: any, id: string, data: Record<string, unknown>) {
  return delegate.upsert({ where: { id }, update: data, create: { id, ...data } });
}

async function mapBy(delegate: any, key: string): Promise<Map<string, any>> {
  const rows = await delegate.findMany();
  return new Map(rows.map((row: any) => [String(row[key]), row]));
}

async function seedPeriodsAndTags() {
  const years = [
    ['2023-2024', '2023-04-01', '2024-03-31'],
    ['2024-2025', '2024-04-01', '2025-03-31'],
    ['2025-2026', '2025-04-01', '2026-03-31'],
    ['2026-2027', '2026-04-01', '2027-03-31'],
  ];
  for (const [label, start, end] of years) {
    await db.financialYear.upsert({
      where: { label },
      update: { startDate: new Date(start), endDate: new Date(end), isActive: true },
      create: { label, startDate: new Date(start), endDate: new Date(end), isActive: true },
    });
  }
  const fy = await db.financialYear.findUnique({ where: { label: '2025-2026' } });
  const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
  for (let i = 0; i < months.length; i += 1) {
    const year = i < 9 ? 2025 : 2026;
    const month = (i + 3) % 12;
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const slug = `${months[i].toLowerCase()}-${year}`;
    await db.reportingPeriod.upsert({
      where: { slug },
      update: { nameEn: `${months[i]} ${year}`, financialYearId: fy.id, startDate: start, endDate: end, isActive: true },
      create: { financialYearId: fy.id, nameEn: `${months[i]} ${year}`, slug, periodType: 'month', startDate: start, endDate: end, isActive: true },
    });
  }
  const tags = ['lac', 'honey', 'millets', 'training', 'procurement', 'membership', 'women-led', 'district-coverage', 'policy', 'research', 'toolkit', 'cooperative'];
  for (const [i, slug] of tags.entries()) {
    await db.tag.upsert({
      where: { slug },
      update: { nameEn: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), isActive: true },
      create: { id: fixtureId('tag', i), nameEn: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), slug, isActive: true },
    });
  }
}

type MediaFixture = { id: string; source: string; extension: string; mime: string; kind: 'image' | 'document' | 'dataset' };

async function seedMedia(userId: string): Promise<MediaFixture[]> {
  const fixtures: MediaFixture[] = [];
  const firstTargetBySource = new Map<string, string>();
  for (let i = 0; i < 40; i += 1) {
    const image = i < 20;
    const pdf = i >= 20 && i < 32;
    const source = image
      ? (i % 2 === 0 ? 'lac-training.png' : 'honey-cooperative.png')
      : pdf
        ? 'sample-publication.pdf'
        : i % 2 === 0
          ? 'dashboard-dataset.csv'
          : 'dashboard-dataset.xlsx';
    const extension = path.extname(source).slice(1);
    const mime = image ? 'image/png' : pdf ? 'application/pdf' : extension === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const kind = image ? 'image' : pdf ? 'document' : 'dataset';
    const id = fixtureId('media', i);
    const storageKey = `media/fixtures/${id}.${extension}`;
    const sourcePath = path.join(ASSET_ROOT, source);
    const targetPath = path.join(STORAGE_ROOT, storageKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await rm(targetPath, { force: true });
    const firstTarget = firstTargetBySource.get(source);
    if (firstTarget) await link(firstTarget, targetPath);
    else {
      await copyFile(sourcePath, targetPath);
      firstTargetBySource.set(source, targetPath);
    }
    const bytes = await readFile(sourcePath);
    const info = await stat(sourcePath);
    await upsert(db.mediaAsset, id, {
      storageKey,
      url: `/api/v1/public/media/${id}/file`,
      fileName: `fixture-${String(i + 1).padStart(2, '0')}.${extension}`,
      mimeType: mime,
      fileSizeBytes: BigInt(info.size),
      width: image ? 1672 : null,
      height: image ? 941 : null,
      title: image ? `Fictional cooperative activity ${i + 1}` : pdf ? `Fictional public document ${i - 19}` : `Dashboard dataset ${i - 31}`,
      altText: image ? `Fictional SIDHKOFED cooperative activity fixture ${i + 1}` : null,
      caption: image ? 'Fictional test image; not an official event photograph.' : null,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      archivedAt: i === 19 ? NOW : null,
      uploadedById: userId,
    });
    fixtures.push({ id, source, extension, mime, kind });
  }
  await db.mediaAsset.update({ where: { id: fixtures[0].id }, data: { replacedById: fixtures[1].id } });
  return fixtures;
}

async function seedSettings(userId: string, media: MediaFixture[]) {
  const overrides: Record<string, unknown> = {
    'site.name': 'SIDHKOFED Demo Portal',
    'site.tagline': 'Fictional cooperative development data for CMS testing',
    'site.logo_media_id': media[0].id,
    'contact.address': 'Demo Secretariat, Ranchi, Jharkhand',
    'contact.phone': '+91 651 000 0000',
    'contact.email': 'demo@sidhkofed.example',
    'contact.office_hours': 'Monday-Friday, 10:00-17:00',
    'contact.map_url': 'https://maps.example.test/sidhkofed-demo',
    'seo.default_description': 'Fictional SIDHKOFED CMS fixture portal.',
    'seo.default_social_image_media_id': media[1].id,
  };
  for (const key of SETTING_KEYS) {
    const def = SETTINGS_CATALOG[key];
    const value = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : def.default;
    const encoded = encodeForStorage(def, value);
    await db.setting.upsert({
      where: { key },
      update: { valueText: encoded.valueText, valueJson: encoded.valueJson, description: def.description, updatedById: userId },
      create: { key, valueText: encoded.valueText, valueJson: encoded.valueJson, description: def.description, updatedById: userId },
    });
  }
}

async function seedCoreContent(userId: string, media: MediaFixture[]) {
  const institutionTypes = await mapBy(db.institutionType, 'slug');
  const districts = await mapBy(db.district, 'slug');
  const commodities = [...(await db.commodity.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const trainingTypes = [...(await db.trainingType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const eventTypes = [...(await db.eventType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const documentTypes = [...(await db.documentType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const knowledgeCategories = [...(await db.knowledgeCategory.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const communicationTypes = [...(await db.communicationType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const tenderTypes = [...(await db.tenderType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const procurementTypes = [...(await db.procurementUpdateType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const faqCategories = [...(await db.faqCategory.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const enquiryTypes = [...(await db.enquiryType.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const blocks = [...(await db.block.findMany({ orderBy: { displayOrder: 'asc' } }))];
  const years = [...(await db.financialYear.findMany({ orderBy: { startDate: 'asc' } }))];
  const periods = [...(await db.reportingPeriod.findMany({ orderBy: { startDate: 'asc' } }))];
  const tags = [...(await db.tag.findMany({ orderBy: { slug: 'asc' } }))];
  const districtRows = [...districts.values()];

  const institutionIds = Array.from({ length: 12 }, (_, i) => fixtureId('institution', i));
  for (let i = 0; i < institutionIds.length; i += 1) {
    const type = [...institutionTypes.values()][i % institutionTypes.size];
    const d = districtRows[i % districtRows.length];
    await upsert(db.institution, institutionIds[i], {
      institutionTypeId: type.id,
      nameEn: `Demo ${d.nameEn} Cooperative Institution ${i + 1}`,
      nameHi: i % 2 === 0 ? `डेमो सहकारी संस्था ${i + 1}` : null,
      descriptionEn: `Fictional partner institution supporting ${commodities[i % commodities.length].nameEn.toLowerCase()} livelihoods.`,
      descriptionHi: i % 2 === 0 ? 'यह केवल परीक्षण के लिए काल्पनिक संस्था है।' : null,
      addressEn: `Test Campus ${i + 1}, ${d.nameEn}, Jharkhand`,
      websiteUrl: `https://example.test/institutions/${i + 1}`,
      logoMediaId: media[i % 10].id,
      districtId: d.id,
      contactEmail: `institution${i + 1}@example.test`,
      contactPhone: `+91-6500-000-${String(i + 1).padStart(3, '0')}`,
      slug: `demo-cooperative-institution-${i + 1}`,
      ...publication(i, 12, 8),
      createdById: userId,
      updatedById: userId,
    });
  }

  const programmeIds = Array.from({ length: 10 }, (_, i) => fixtureId('programme', i));
  for (let i = 0; i < programmeIds.length; i += 1) {
    await upsert(db.programmeScheme, programmeIds[i], {
      titleEn: `Demo ${commodities[i % commodities.length].nameEn} Enterprise Programme ${i + 1}`,
      titleHi: i % 2 === 0 ? `डेमो आजीविका कार्यक्रम ${i + 1}` : null,
      shortCode: `DEMO-${String(i + 1).padStart(2, '0')}`,
      summaryEn: 'Fictional programme used to exercise programme listings and relationships.',
      descriptionEn: 'Supports training, toolkit distribution, institutional partnerships, and public information testing.',
      objectivesEn: 'Validate filters, relationships, homepage cards, and detail rendering.',
      eligibilityEn: 'Fictional cooperative institutions in the demo dataset.',
      benefitsEn: 'Training and demonstration toolkit support.',
      applicationProcessEn: 'No real application; this is fixture content.',
      fundingSource: i % 2 === 0 ? 'Demo State Plan' : 'Demo Cooperative Fund',
      startDate: new Date(`202${4 + (i % 3)}-04-01`),
      endDate: new Date(`202${6 + (i % 3)}-03-31`),
      coverMediaId: media[i % 10].id,
      slug: `demo-enterprise-programme-${i + 1}`,
      ...publication(i, 10, 6),
      createdById: userId,
      updatedById: userId,
    });
    await db.programmeCommodity.deleteMany({ where: { programmeSchemeId: programmeIds[i] } });
    await db.programmePermittedTrainingType.deleteMany({ where: { programmeSchemeId: programmeIds[i] } });
    await db.programmeCommodity.createMany({ data: [0, 1].map((offset) => ({ id: fixtureId('programme-commodity', `${i}-${offset}`), programmeSchemeId: programmeIds[i], commodityId: commodities[(i + offset) % commodities.length].id })) });
    await db.programmePermittedTrainingType.createMany({ data: [0, 1].map((offset) => ({ id: fixtureId('programme-training', `${i}-${offset}`), programmeSchemeId: programmeIds[i], trainingTypeId: trainingTypes[(i + offset) % trainingTypes.length].id })) });
  }

  const toolkitIds = Array.from({ length: 10 }, (_, i) => fixtureId('toolkit', i));
  const toolkitItemIds: string[][] = [];
  for (let i = 0; i < toolkitIds.length; i += 1) {
    await upsert(db.toolkit, toolkitIds[i], {
      titleEn: `Demo ${commodities[i % commodities.length].nameEn} Starter Toolkit ${i + 1}`,
      titleHi: i % 2 === 0 ? `डेमो टूलकिट ${i + 1}` : null,
      summaryEn: 'Fictional toolkit definition for distribution testing.',
      descriptionEn: 'Contains three reusable demonstration items.',
      programmeSchemeId: programmeIds[i],
      commodityId: commodities[i % commodities.length].id,
      coverMediaId: media[(i + 2) % 10].id,
      slug: `demo-starter-toolkit-${i + 1}`,
      ...publication(i, 10, 0),
      createdById: userId,
      updatedById: userId,
    });
    const ids = [0, 1, 2].map((j) => fixtureId('toolkit-item', `${i}-${j}`));
    toolkitItemIds.push(ids);
    for (let j = 0; j < ids.length; j += 1) {
      await upsert(db.toolkitItem, ids[j], {
        toolkitId: toolkitIds[i],
        nameEn: ['Field tool set', 'Protective material', 'Reference booklet'][j],
        nameHi: j === 2 ? 'संदर्भ पुस्तिका' : null,
        descriptionEn: 'Fictional test item.',
        unit: j === 2 ? 'copy' : 'set',
        distributionBasis: j === 1 ? 'group' : 'individual',
        defaultQuantityPerUnit: j === 2 ? 1 : 2,
        defaultGroupSize: j === 1 ? 10 : null,
        quantitySummary: 25 + j,
        isActive: !(i === 9 && j === 2),
        displayOrder: j + 1,
      });
    }
  }

  const documentIds = Array.from({ length: 18 }, (_, i) => fixtureId('document', i));
  for (let i = 0; i < documentIds.length; i += 1) {
    await upsert(db.document, documentIds[i], {
      titleEn: `Demo ${documentTypes[i % documentTypes.length].nameEn} Publication ${i + 1}`,
      titleHi: i % 2 === 0 ? `डेमो दस्तावेज़ ${i + 1}` : null,
      descriptionEn: `Fictional ${commodities[i % commodities.length].nameEn.toLowerCase()} reference document for API testing.`,
      descriptionHi: i % 3 === 0 ? 'यह परीक्षण हेतु काल्पनिक दस्तावेज़ है।' : null,
      documentTypeId: documentTypes[i % documentTypes.length].id,
      fileAssetId: media[20 + (i % 12)].id,
      publicationDate: new Date(`202${4 + (i % 3)}-${String((i % 9) + 1).padStart(2, '0')}-15`),
      language: i % 4 === 0 ? 'hi' : 'en',
      isPublic: i !== 15,
      showInKnowledgeCentre: i < 12,
      knowledgeCategoryId: i < 12 ? knowledgeCategories[i % knowledgeCategories.length].id : null,
      financialYearId: years[i % years.length].id,
      slug: `demo-publication-${i + 1}`,
      ...publication(i, 18, 0),
      createdById: userId,
      updatedById: userId,
    });
    await Promise.all([
      db.documentCommodity.deleteMany({ where: { documentId: documentIds[i] } }),
      db.documentDistrict.deleteMany({ where: { documentId: documentIds[i] } }),
      db.documentTag.deleteMany({ where: { documentId: documentIds[i] } }),
      db.documentProgramme.deleteMany({ where: { documentId: documentIds[i] } }),
      db.documentInstitution.deleteMany({ where: { documentId: documentIds[i] } }),
    ]);
    await db.documentCommodity.create({ data: { id: fixtureId('document-commodity', i), documentId: documentIds[i], commodityId: commodities[i % commodities.length].id } });
    await db.documentDistrict.create({ data: { id: fixtureId('document-district', i), documentId: documentIds[i], districtId: districtRows[i % districtRows.length].id } });
    await db.documentTag.create({ data: { id: fixtureId('document-tag', i), documentId: documentIds[i], tagId: tags[i % tags.length].id } });
    await db.documentProgramme.create({ data: { id: fixtureId('document-programme', i), documentId: documentIds[i], programmeSchemeId: programmeIds[i % programmeIds.length] } });
    await db.documentInstitution.create({ data: { id: fixtureId('document-institution', i), documentId: documentIds[i], institutionId: institutionIds[i % institutionIds.length] } });
  }

  const galleryIds = Array.from({ length: 10 }, (_, i) => fixtureId('gallery', i));
  for (let i = 0; i < galleryIds.length; i += 1) {
    await upsert(db.gallery, galleryIds[i], {
      titleEn: `Demo Field Activity Gallery ${i + 1}`,
      titleHi: i % 2 === 0 ? `डेमो गतिविधि गैलरी ${i + 1}` : null,
      descriptionEn: 'Fictional gallery using compact reusable fixture images.',
      coverMediaId: media[i % 10].id,
      slug: `demo-field-gallery-${i + 1}`,
      ...publication(i, 10, 0),
      createdById: userId,
      updatedById: userId,
    });
    await db.galleryImage.deleteMany({ where: { galleryId: galleryIds[i] } });
    await db.galleryImage.createMany({ data: [0, 1, 2].map((j) => ({ id: fixtureId('gallery-image', `${i}-${j}`), galleryId: galleryIds[i], mediaId: media[(i * 3 + j) % 20].id, displayOrder: j + 1, captionEn: `Fictional activity image ${j + 1}`, captionHi: j === 0 ? 'काल्पनिक गतिविधि चित्र' : null })) });
  }

  const eventIds = Array.from({ length: 24 }, (_, i) => fixtureId('event', i));
  for (let i = 0; i < eventIds.length; i += 1) {
    const completed = i < 12;
    const eventStatus = completed ? 'completed' : i < 16 ? 'scheduled' : i < 19 ? 'ongoing' : i < 21 ? 'postponed' : 'cancelled';
    const d = districtRows[i % districtRows.length];
    await upsert(db.event, eventIds[i], {
      eventTypeId: eventTypes[i % eventTypes.length].id,
      trainingTypeId: i % 3 === 0 ? trainingTypes[i % trainingTypes.length].id : null,
      titleEn: `Demo ${commodities[i % commodities.length].nameEn} Cooperative Activity ${i + 1}`,
      titleHi: i % 2 === 0 ? `डेमो सहकारी गतिविधि ${i + 1}` : null,
      summaryEn: `Fictional ${eventStatus} event in ${d.nameEn} for listing, filter, and detail tests.`,
      descriptionEn: 'Includes linked programmes, institutions, documents, galleries, and commodities.',
      dateMode: i % 4 === 0 ? 'range' : 'single',
      startDate: completed ? new Date(`2025-${String((i % 9) + 1).padStart(2, '0')}-10`) : new Date(`2026-${String((i % 6) + 7).padStart(2, '0')}-10`),
      endDate: i % 4 === 0 ? (completed ? new Date(`2025-${String((i % 9) + 1).padStart(2, '0')}-12`) : new Date(`2026-${String((i % 6) + 7).padStart(2, '0')}-12`)) : null,
      locationText: `Demo Community Hall, ${d.nameEn}`,
      districtId: d.id,
      blockId: blocks[i % blocks.length]?.districtId === d.id ? blocks[i % blocks.length].id : null,
      coverMediaId: media[i % 20].id,
      eventStatus,
      statusOverride: eventStatus === 'postponed' || eventStatus === 'cancelled',
      cancellationReason: eventStatus === 'cancelled' ? 'Fictional cancellation for filter testing.' : null,
      revisedStartDate: eventStatus === 'postponed' ? new Date('2027-02-15') : null,
      dynamicValues: { test_fixture: true, batch_number: i + 1, demonstration_topic: commodities[i % commodities.length].nameEn },
      outcomeSummaryEn: completed ? 'Demo activity completed with positive fictional outcomes.' : null,
      keyHighlights: completed ? 'Training; demonstration; cooperative planning' : null,
      finalParticipantCount: completed ? 30 + i * 3 : null,
      participantMaleCount: completed ? 12 + i : null,
      participantFemaleCount: completed ? 18 + i * 2 : null,
      participantOtherCount: completed ? 0 : null,
      completionRemarksEn: completed ? 'Fixture completion record.' : null,
      completedDate: completed ? new Date(`2025-${String((i % 9) + 1).padStart(2, '0')}-12`) : null,
      translationSource: i % 2 === 0 ? 'manual' : 'missing',
      slug: `demo-cooperative-activity-${i + 1}`,
      ...publication(i, 24, 6),
      createdById: userId,
      updatedById: userId,
    });
    await Promise.all([
      db.eventCommodity.deleteMany({ where: { eventId: eventIds[i] } }),
      db.eventProgramme.deleteMany({ where: { eventId: eventIds[i] } }),
      db.eventInstitution.deleteMany({ where: { eventId: eventIds[i] } }),
      db.eventDocument.deleteMany({ where: { eventId: eventIds[i] } }),
      db.eventGallery.deleteMany({ where: { eventId: eventIds[i] } }),
    ]);
    await db.eventCommodity.create({ data: { id: fixtureId('event-commodity', i), eventId: eventIds[i], commodityId: commodities[i % commodities.length].id } });
    await db.eventProgramme.create({ data: { id: fixtureId('event-programme', i), eventId: eventIds[i], programmeSchemeId: programmeIds[i % programmeIds.length] } });
    await db.eventInstitution.create({ data: { id: fixtureId('event-institution', i), eventId: eventIds[i], institutionId: institutionIds[i % institutionIds.length] } });
    await db.eventDocument.create({ data: { id: fixtureId('event-document', i), eventId: eventIds[i], documentId: documentIds[i % documentIds.length] } });
    await db.eventGallery.create({ data: { id: fixtureId('event-gallery', i), eventId: eventIds[i], galleryId: galleryIds[i % galleryIds.length] } });
  }

  for (let i = 0; i < 12; i += 1) {
    await upsert(db.eventNews, fixtureId('news', i), {
      eventId: eventIds[i],
      titleEn: `Demo News: Cooperative Activity ${i + 1} Completed`,
      titleHi: i % 2 === 0 ? `डेमो समाचार ${i + 1}` : null,
      summaryEn: 'Fictional news projection from a completed event.',
      bodyEn: 'This story exists to test event-to-news projection and public news detail pages.',
      coverMediaId: media[(i + 1) % 20].id,
      newsPublishedAt: new Date(`2025-${String((i % 9) + 1).padStart(2, '0')}-15T08:00:00Z`),
      slug: `demo-activity-news-${i + 1}`,
      ...publication(i, 12, 6),
      createdById: userId,
      updatedById: userId,
    });
  }

  await db.eventFieldDefinition.deleteMany({ where: { id: { in: Array.from({ length: 12 }, (_, i) => fixtureId('field-definition', i)) } } });
  await db.eventFieldDefinition.createMany({ data: Array.from({ length: 12 }, (_, i) => ({
    id: fixtureId('field-definition', i),
    eventTypeId: eventTypes[i % eventTypes.length].id,
    fieldKey: `fixture_field_${Math.floor(i / eventTypes.length) + 1}`,
    labelEn: `Fixture field ${i + 1}`,
    labelHi: i % 2 === 0 ? `परीक्षण फ़ील्ड ${i + 1}` : null,
    dataType: ['text', 'number', 'boolean', 'select'][i % 4],
    isRequired: i % 3 === 0,
    options: i % 4 === 3 ? ['Option A', 'Option B'] : null,
    displayOrder: i + 1,
    isActive: true,
  })) });

  for (let i = 0; i < 12; i += 1) {
    const summaryId = fixtureId('distribution', i);
    await upsert(db.toolkitDistributionSummary, summaryId, {
      eventId: eventIds[i], toolkitId: toolkitIds[i % toolkitIds.length], distributionDone: true,
      distributionModel: i % 3 === 0 ? 'mixed' : i % 2 === 0 ? 'individual' : 'group',
      participantsCovered: 30 + i * 4, distributionDate: new Date(`2025-${String((i % 9) + 1).padStart(2, '0')}-12`),
      remarksEn: 'Fictional distribution summary.', createdById: userId, updatedById: userId,
    });
    await db.toolkitDistributionItem.deleteMany({ where: { toolkitDistributionSummaryId: summaryId } });
    const items = toolkitItemIds[i % toolkitItemIds.length];
    await db.toolkitDistributionItem.createMany({ data: items.map((itemId, j) => ({
      id: fixtureId('distribution-item', `${i}-${j}`), toolkitDistributionSummaryId: summaryId, toolkitItemId: itemId,
      distributionBasis: j === 1 ? 'group' : 'individual', quantityPerUnit: j + 1,
      numberOfUnitsOrGroups: 10 + i, totalQuantity: (j + 1) * (10 + i), manualOverride: j === 2,
    })) });
  }

  const simpleModules = [
    ['officialCommunication', 'communication', 12, communicationTypes, 'communicationTypeId'],
    ['tender', 'tender', 12, tenderTypes, 'tenderTypeId'],
    ['procurementUpdate', 'procurement', 12, procurementTypes, 'procurementUpdateTypeId'],
  ] as const;
  for (const [delegateName, scope, count, typeRows, typeField] of simpleModules) {
    for (let i = 0; i < count; i += 1) {
      const common: any = {
        titleEn: `Demo ${scope.replace(/-/g, ' ')} record ${i + 1}`,
        titleHi: i % 2 === 0 ? `डेमो सूचना ${i + 1}` : null,
        summaryEn: `Fictional ${scope} content covering ${commodities[i % commodities.length].nameEn}.`,
        slug: `demo-${scope}-${i + 1}`,
        [typeField]: typeRows[i % typeRows.length].id,
        ...publication(i, count, 6),
        createdById: userId,
        updatedById: userId,
      };
      if (delegateName === 'officialCommunication') Object.assign(common, { bodyEn: 'Fixture communication body.', referenceNumber: `DEMO/COM/${2026}/${i + 1}`, issueDate: new Date(`2026-${String((i % 6) + 1).padStart(2, '0')}-05`), effectiveDate: PAST, expiryDate: i % 3 === 0 ? new Date('2026-12-31') : null, issuingAuthority: 'Demo SIDHKOFED Secretariat', documentId: documentIds[i % documentIds.length] });
      if (delegateName === 'tender') Object.assign(common, { tenderNumber: `DEMO-TENDER-${String(i + 1).padStart(3, '0')}`, publishDate: new Date(`2026-${String((i % 6) + 1).padStart(2, '0')}-01`), submissionDeadline: new Date(`2026-${String((i % 6) + 6).padStart(2, '0')}-20T12:00:00Z`), openingDate: new Date(`2026-${String((i % 6) + 6).padStart(2, '0')}-21T10:00:00Z`), tenderStatus: i < 6 ? 'active' : 'closed', gemUrl: `https://gem.gov.in/demo/${i + 1}` });
      if (delegateName === 'procurementUpdate') Object.assign(common, { descriptionEn: 'Fixture procurement information only; no transaction processing.', commodityId: commodities[i % commodities.length].id, rate: typeRows[i % typeRows.length].slug === 'procurement-rate' ? 125 + i * 5 : null, unit: typeRows[i % typeRows.length].slug === 'procurement-rate' ? 'kg' : null, effectiveDate: new Date(`2026-${String((i % 6) + 1).padStart(2, '0')}-10`), periodStart: PAST, periodEnd: FUTURE, districtId: districtRows[i % districtRows.length].id, locationText: `Demo procurement centre ${i + 1}`, programmeSchemeId: programmeIds[i % programmeIds.length], documentId: documentIds[i % documentIds.length], status: i < 8 ? 'active' : 'closed' });
      await upsert(db[delegateName], fixtureId(scope, i), common);
    }
  }

  const pageIds = Array.from({ length: 12 }, (_, i) => fixtureId('page', i));
  for (let i = 0; i < pageIds.length; i += 1) {
    await upsert(db.page, pageIds[i], {
      titleEn: `Demo Institutional Page ${i + 1}`, titleHi: i % 2 === 0 ? `डेमो पृष्ठ ${i + 1}` : null,
      bodyEn: 'Fictional institutional page content for CMS editing, SEO, menus, and public detail testing.',
      bodyHi: i % 2 === 0 ? 'यह केवल परीक्षण के लिए काल्पनिक पृष्ठ है।' : null,
      metaTitleEn: `Demo Page ${i + 1} | SIDHKOFED`, metaDescriptionEn: 'Fictional SEO fixture.',
      slug: `demo-page-${i + 1}`, ...publication(i, 12, 0), createdById: userId, updatedById: userId,
    });
  }
  const menuIds = Array.from({ length: 24 }, (_, i) => fixtureId('menu', i));
  for (let i = 0; i < menuIds.length; i += 1) {
    await upsert(db.menuItem, menuIds[i], {
      labelEn: `Demo Menu ${i + 1}`, labelHi: i % 2 === 0 ? `डेमो मेनू ${i + 1}` : null,
      location: i < 12 ? 'header' : i < 20 ? 'footer' : 'utility',
      url: i % 4 === 0 ? `https://example.test/menu/${i + 1}` : null,
      pageId: i % 4 === 0 ? null : pageIds[i % pageIds.length],
      parentId: i >= 6 && i < 12 ? menuIds[i % 6] : null,
      opensNewTab: i % 4 === 0, displayOrder: i + 1, isActive: i !== 23, createdById: userId, updatedById: userId,
    });
  }

  for (let i = 0; i < 12; i += 1) {
    await upsert(db.faq, fixtureId('faq', i), {
      faqCategoryId: faqCategories[i % faqCategories.length].id,
      questionEn: `How does fictional CMS feature ${i + 1} work?`, questionHi: i % 2 === 0 ? `डेमो प्रश्न ${i + 1}?` : null,
      answerEn: 'This answer is fictional and exists only to test FAQ listing, search, categories, and visibility.',
      answerHi: i % 2 === 0 ? 'यह केवल परीक्षण उत्तर है।' : null,
      slug: `demo-faq-${i + 1}`, ...publication(i, 12, 0), createdById: userId, updatedById: userId,
    });
  }
  for (let i = 0; i < 10; i += 1) {
    await upsert(db.digitalService, fixtureId('digital-service', i), {
      titleEn: `Demo Digital Service ${i + 1}`, titleHi: i % 2 === 0 ? `डेमो डिजिटल सेवा ${i + 1}` : null,
      descriptionEn: 'Fictional external service link for card and homepage testing.', externalUrl: `https://example.test/services/${i + 1}`,
      iconMediaId: media[i % 10].id, slug: `demo-digital-service-${i + 1}`,
      ...publication(i, 10, 8), createdById: userId, updatedById: userId,
    });
  }
  for (let i = 0; i < 10; i += 1) {
    await upsert(db.video, fixtureId('video', i), {
      titleEn: `Demo Cooperative Video ${i + 1}`, titleHi: i % 2 === 0 ? `डेमो वीडियो ${i + 1}` : null,
      descriptionEn: 'Fictional YouTube-linked video metadata with a local thumbnail.', youtubeId: `demoVid${String(i + 1).padStart(4, '0')}`,
      youtubeUrl: `https://www.youtube.com/watch?v=demoVid${String(i + 1).padStart(4, '0')}`,
      thumbnailMediaId: media[(i + 5) % 20].id, slug: `demo-cooperative-video-${i + 1}`,
      ...publication(i, 10, 3), createdById: userId, updatedById: userId,
    });
  }

  for (let i = 0; i < 20; i += 1) {
    await upsert(db.institutionalMembership, fixtureId('membership', i), {
      institutionId: institutionIds[i % institutionIds.length],
      membershipLevel: i % 4 < 2 ? 'sidhkofed' : 'district_union',
      membershipType: i % 2 === 0 ? 'primary' : 'nominal',
      membershipNumber: `DEMO-MEM-${String(i + 1).padStart(4, '0')}`,
      districtId: districtRows[i % districtRows.length].id,
      districtUnionId: i % 4 >= 2 ? institutionIds[(i + 1) % institutionIds.length] : null,
      reportingPeriodId: periods[i % periods.length].id,
      status: i < 17 ? 'active' : 'inactive', joinDate: new Date(`202${3 + (i % 3)}-${String((i % 9) + 1).padStart(2, '0')}-01`),
      notesEn: 'Fictional institutional membership.', slug: `demo-membership-${i + 1}`,
      ...publication(i, 20, 0), createdById: userId, updatedById: userId,
    });
  }

  for (let i = 0; i < 15; i += 1) {
    await upsert(db.enquiry, fixtureId('enquiry', i), {
      enquiryTypeId: enquiryTypes[i % enquiryTypes.length].id,
      name: `Demo Enquirer ${i + 1}`, mobile: `900000${String(i + 1).padStart(4, '0')}`, email: `enquirer${i + 1}@example.test`,
      subject: `Fictional enquiry about ${commodities[i % commodities.length].nameEn}`,
      message: 'This is a fictional enquiry created for CMS administration and export testing.', organization: i % 2 === 0 ? `Demo Cooperative ${i + 1}` : null,
      commodityId: commodities[i % commodities.length].id, programmeSchemeId: programmeIds[i % programmeIds.length],
      submittedAt: new Date(`2026-06-${String((i % 20) + 1).padStart(2, '0')}T10:00:00Z`), sourceIpHash: createHash('sha256').update(`fixture-ip-${i}`).digest('hex'),
      spamState: i === 13 ? 'suspected' : i === 14 ? 'spam' : 'clean', internalNotes: i % 5 === 0 ? 'Fixture follow-up note.' : null,
      archivedAt: i === 12 ? NOW : null,
    });
  }

  return { institutionIds, programmeIds, toolkitIds, documentIds, galleryIds, eventIds, pageIds };
}

async function seedDashboard(userId: string, media: MediaFixture[]) {
  const reports = await db.dashboardReport.findMany({ orderBy: { displayOrder: 'asc' } });
  const fy = await db.financialYear.findUnique({ where: { label: '2025-2026' } });
  const period = await db.reportingPeriod.findUnique({ where: { slug: 'fy-2025-2026' } });
  for (const [i, report] of reports.entries()) {
    await db.dashboardReport.update({ where: { id: report.id }, data: {
      titleHi: i % 2 === 0 ? `डेमो डैशबोर्ड रिपोर्ट ${i + 1}` : null,
      descriptionEn: 'Fictional fixed-layout dashboard report.', publicationState: 'published', publicVisibility: true,
      publishedAt: PAST, archivedAt: null, showOnHomepage: i < 5, isActive: true, updatedById: userId,
    } });
    const datasetId = fixtureId('dashboard-dataset', i);
    await upsert(db.dashboardDataset, datasetId, {
      reportId: report.id, source: i % 3 === 0 ? 'excel' : i % 3 === 1 ? 'manual' : 'cms_derived',
      financialYearId: fy.id, reportingPeriodId: period.id, sourceFileAssetId: media[32 + (i % 8)].id,
      rawRows: [{ district: 'Ranchi', value: 100 + i }, { district: 'Gumla', value: 80 + i }], rowCount: 2,
      status: i === 12 ? 'failed' : 'processed', processedAt: i === 12 ? null : NOW, createdById: userId,
    });
    for (let j = 0; j < 4; j += 1) {
      const metricId = fixtureId('dashboard-metric', `${i}-${j}`);
      await upsert(db.dashboardMetric, metricId, {
        reportId: report.id, metricKey: `fixture_metric_${j + 1}`, labelEn: ['Total activities', 'Participants reached', 'Districts covered', 'Completion rate'][j],
        labelHi: j < 2 ? `डेमो संकेतक ${j + 1}` : null, value: j === 3 ? 87.5 : 100 + i * 10 + j,
        valueText: null, unit: j === 3 ? 'percent' : j === 2 ? 'districts' : 'count', financialYearId: fy.id,
        reportingPeriodId: period.id, source: i % 3 === 0 ? 'excel' : i % 3 === 1 ? 'manual' : 'cms_derived', datasetId,
        displayOrder: j + 1, createdById: userId, updatedById: userId,
      });
    }
  }
}

async function seedMediaUsages(media: MediaFixture[], entities: Awaited<ReturnType<typeof seedCoreContent>>) {
  const targets = [
    ...entities.eventIds.map((id, i) => ({ id, type: 'event', field: 'cover_media_id', mediaId: media[i % 20].id })),
    ...entities.institutionIds.map((id, i) => ({ id, type: 'institution', field: 'logo_media_id', mediaId: media[i % 20].id })),
    ...entities.programmeIds.map((id, i) => ({ id, type: 'programme', field: 'cover_media_id', mediaId: media[i % 20].id })),
  ];
  for (const [i, target] of targets.entries()) {
    await upsert(db.mediaUsage, fixtureId('media-usage', i), { mediaId: target.mediaId, entityType: target.type, entityId: target.id, field: target.field });
  }
}

async function seedAuditLogs(userId: string) {
  const actions = ['create', 'update', 'publish', 'unpublish', 'archive', 'restore', 'media_replace', 'config_change', 'master_change', 'login'];
  const modules = ['events', 'documents', 'programmes', 'toolkits', 'institutions', 'settings', 'media', 'dashboard'];
  for (let i = 0; i < 36; i += 1) {
    await upsert(db.auditLog, fixtureId('audit', i), {
      userId, action: actions[i % actions.length], module: modules[i % modules.length], recordId: i % 5 === 0 ? null : fixtureId('audit-record', i),
      previousState: i % 3 === 0 ? JSON.stringify({ publication_state: 'draft' }) : null,
      newState: JSON.stringify({ fixture: true, sequence: i + 1 }), changeSummary: `Fictional audit action ${i + 1}`,
      metadata: { fixture: true, request_id: `fixture-request-${i + 1}` }, ipHash: createHash('sha256').update(`audit-ip-${i}`).digest('hex'),
      createdAt: new Date(NOW.getTime() - i * 3_600_000),
    });
  }
}

export async function seedFixtures(): Promise<void> {
  console.log(`Fixture storage root: ${STORAGE_ROOT}`);
  const userId = await seedBaseline(prisma);
  await seedPeriodsAndTags();
  const media = await seedMedia(userId);
  await seedSettings(userId, media);
  const entities = await seedCoreContent(userId, media);
  await seedDashboard(userId, media);
  await seedMediaUsages(media, entities);
  await seedAuditLogs(userId);
  console.log('Full deterministic fixture dataset seeded.');
}

export async function disconnectFixtures(): Promise<void> {
  await prisma.$disconnect();
}

if (require.main === module) {
  seedFixtures()
    .catch((error) => {
      console.error('Fixture seed failed:', error);
      process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
}
