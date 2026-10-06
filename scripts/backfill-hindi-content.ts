/**
 * Fill missing Hindi values for the seeded CMS content in the development database.
 *
 * Safety properties:
 * - dry-run by default; pass --apply to commit changes
 * - only updates a `*_hi` field when it is NULL or blank
 * - refuses to update anything if even one English value has no reviewed mapping
 * - performs all writes in one transaction
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

type Pair = {
  table: string;
  en: string;
  hi: string;
};

type MissingValue = Pair & {
  value: string;
  rows: number;
};

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

const exact = new Map<string, string>([
  // Master data
  ['Notice', 'सूचना'],
  ['Office Order', 'कार्यालय आदेश'],
  ['Public Announcement', 'सार्वजनिक घोषणा'],
  ['Acts', 'अधिनियम'],
  ['Articles', 'लेख'],
  ['Bye-Laws', 'उपविधियाँ'],
  ['Formats', 'प्रारूप'],
  ['Forms', 'प्रपत्र'],
  ['Gap Study', 'अंतराल अध्ययन'],
  ['Guidelines', 'दिशानिर्देश'],
  ['Manuals', 'पुस्तिकाएँ'],
  ['Reports', 'प्रतिवेदन'],
  ['Research Paper', 'शोध पत्र'],
  ['Training Material', 'प्रशिक्षण सामग्री'],
  ['Buyer Enquiry', 'खरीदार पूछताछ'],
  ['General Enquiry', 'सामान्य पूछताछ'],
  ['Membership Enquiry', 'सदस्यता पूछताछ'],
  ['Partnership Enquiry', 'साझेदारी पूछताछ'],
  ['Seller Enquiry', 'विक्रेता पूछताछ'],
  ['Storage / Godown Enquiry', 'भंडारण / गोदाम पूछताछ'],
  ['Awareness Programme', 'जागरूकता कार्यक्रम'],
  ['Capacity Building', 'क्षमता निर्माण'],
  ['Exposure Visit', 'परिचयात्मक भ्रमण'],
  ['Field Visit', 'क्षेत्र भ्रमण'],
  ['Meeting', 'बैठक'],
  ['Membership Programme', 'सदस्यता कार्यक्रम'],
  ['MoU Signing', 'समझौता ज्ञापन हस्ताक्षर'],
  ['Other Institutional Activity', 'अन्य संस्थागत गतिविधि'],
  ['Training', 'प्रशिक्षण'],
  ['Workshop', 'कार्यशाला'],
  ['Cooperative Organization', 'सहकारी संगठन'],
  ['Corporate Buyer', 'कॉर्पोरेट खरीदार'],
  ['Financial Institution', 'वित्तीय संस्था'],
  ['Government Department', 'सरकारी विभाग'],
  ['NGO', 'गैर-सरकारी संगठन'],
  ['Other Partner', 'अन्य साझेदार'],
  ['Technical Agency', 'तकनीकी एजेंसी'],
  ['Training Institution', 'प्रशिक्षण संस्था'],
  ['University', 'विश्वविद्यालय'],
  ['Acts, Bye-laws and Forms', 'अधिनियम, उपविधियाँ और प्रपत्र'],
  ['Research and Reports', 'अनुसंधान और प्रतिवेदन'],
  ['Training Resources and Formats', 'प्रशिक्षण संसाधन और प्रारूप'],
  ['Procurement Achievement', 'खरीद उपलब्धि'],
  ['Procurement Announcement', 'खरीद घोषणा'],
  ['Procurement Centre Update', 'खरीद केंद्र अद्यतन'],
  ['Procurement Rate', 'खरीद दर'],
  ['Procurement Schedule', 'खरीद कार्यक्रम'],
  ['Trade Opportunity', 'व्यापार अवसर'],
  ['Consultancy', 'परामर्श सेवा'],
  ['Goods', 'वस्तुएँ'],
  ['Services', 'सेवाएँ'],
  ['Works', 'कार्य'],

  // Repeated fixture prose
  [
    'Fictional external service link for card and homepage testing.',
    'कार्ड और मुखपृष्ठ परीक्षण के लिए काल्पनिक बाहरी सेवा लिंक।',
  ],
  [
    'This story exists to test event-to-news projection and public news detail pages.',
    'यह कहानी कार्यक्रम से समाचार निर्माण और सार्वजनिक समाचार विवरण पृष्ठों के परीक्षण के लिए है।',
  ],
  [
    'Fictional news projection from a completed event.',
    'पूर्ण कार्यक्रम से तैयार किया गया काल्पनिक समाचार।',
  ],
  ['Fixture completion record.', 'परीक्षण हेतु पूर्णता अभिलेख।'],
  [
    'Includes linked programmes, institutions, documents, galleries, and commodities.',
    'इसमें संबद्ध कार्यक्रम, संस्थाएँ, दस्तावेज़, गैलरी और वस्तुएँ शामिल हैं।',
  ],
  [
    'Demo activity completed with positive fictional outcomes.',
    'डेमो गतिविधि सकारात्मक काल्पनिक परिणामों के साथ पूर्ण हुई।',
  ],
  [
    'This answer is fictional and exists only to test FAQ listing, search, page assignment, and visibility.',
    'यह उत्तर काल्पनिक है और केवल अक्सर पूछे जाने वाले प्रश्नों की सूची, खोज, पृष्ठ निर्धारण और दृश्यता के परीक्षण के लिए है।',
  ],
  [
    'Fictional gallery using compact reusable fixture images.',
    'छोटे, पुनः उपयोग योग्य परीक्षण चित्रों वाली काल्पनिक गैलरी।',
  ],
  ['Fictional institutional membership.', 'काल्पनिक संस्थागत सदस्यता।'],
  ['Fixture communication body.', 'परीक्षण हेतु संचार विवरण।'],
  [
    'Fixture procurement information only; no transaction processing.',
    'केवल परीक्षण हेतु खरीद जानकारी; इसमें कोई लेन-देन प्रक्रिया नहीं है।',
  ],
  [
    'No real application; this is fixture content.',
    'कोई वास्तविक आवेदन नहीं; यह परीक्षण सामग्री है।',
  ],
  ['Training and demonstration toolkit support.', 'प्रशिक्षण और प्रदर्शन टूलकिट सहायता।'],
  [
    'Supports training, toolkit distribution, institutional partnerships, and public information testing.',
    'प्रशिक्षण, टूलकिट वितरण, संस्थागत साझेदारी और सार्वजनिक सूचना परीक्षण में सहायता करता है।',
  ],
  [
    'Fictional cooperative institutions in the demo dataset.',
    'डेमो डेटा में शामिल काल्पनिक सहकारी संस्थाएँ।',
  ],
  [
    'Validate filters, relationships, homepage cards, and detail rendering.',
    'फ़िल्टर, संबंध, मुखपृष्ठ कार्ड और विवरण प्रदर्शन की जाँच करना।',
  ],
  [
    'Fictional programme used to exercise programme listings and relationships.',
    'कार्यक्रम सूचियों और संबंधों के परीक्षण के लिए प्रयुक्त काल्पनिक कार्यक्रम।',
  ],
  ['Fictional distribution summary.', 'काल्पनिक वितरण सारांश।'],
  ['Fictional test item.', 'काल्पनिक परीक्षण वस्तु।'],
  ['Field tool set', 'क्षेत्रीय उपकरण सेट'],
  ['Protective material', 'सुरक्षा सामग्री'],
  [
    'Contains three reusable demonstration items.',
    'इसमें तीन पुनः उपयोग योग्य प्रदर्शन वस्तुएँ शामिल हैं।',
  ],
  [
    'Fictional toolkit definition for distribution testing.',
    'वितरण परीक्षण के लिए काल्पनिक टूलकिट परिभाषा।',
  ],
  [
    'Fictional YouTube-linked video metadata with a local thumbnail.',
    'स्थानीय थंबनेल के साथ काल्पनिक YouTube-संबद्ध वीडियो मेटाडेटा।',
  ],

  // Leadership
  ['Chief Executive Officer, SIDHKOFED', 'मुख्य कार्यपालक पदाधिकारी, SIDHKOFED'],
  ["Hon'ble Chief Minister, Jharkhand", 'माननीय मुख्यमंत्री, झारखंड'],
  [
    "Hon'ble Minister, Agriculture, Animal Husbandry & Cooperative, Jharkhand",
    'माननीय मंत्री, कृषि, पशुपालन एवं सहकारिता, झारखंड',
  ],
  ['Shmt. Shilpi Neha Tirkey', 'श्रीमती शिल्पी नेहा तिर्की'],
  ['Shri Hemant Soren', 'श्री हेमंत सोरेन'],
  ['Shri Shashi Ranjan, I.A.S.', 'श्री शशि रंजन, भा.प्र.से.'],
  ['CEO, SIDHKOFED', 'मुख्य कार्यपालक पदाधिकारी, SIDHKOFED'],
  ['President, SIDHKOFED', 'अध्यक्ष, SIDHKOFED'],
  ['Vice-President, SIDHKOFED', 'उपाध्यक्ष, SIDHKOFED'],

  // Reporting periods
  ['April 2025', 'अप्रैल 2025'],
  ['May 2025', 'मई 2025'],
  ['June 2025', 'जून 2025'],
  ['July 2025', 'जुलाई 2025'],
  ['August 2025', 'अगस्त 2025'],
  ['September 2025', 'सितंबर 2025'],
  ['October 2025', 'अक्टूबर 2025'],
  ['November 2025', 'नवंबर 2025'],
  ['December 2025', 'दिसंबर 2025'],
  ['January 2026', 'जनवरी 2026'],
  ['February 2026', 'फ़रवरी 2026'],
  ['March 2026', 'मार्च 2026'],
  ['Calendar Year 2025', 'कैलेंडर वर्ष 2025'],
  ['Cumulative', 'संचयी'],
  ['FY 2025-2026', 'वित्तीय वर्ष 2025-2026'],

  // Bespoke dummy report activities
  [
    'FY26-27 Dummy Activity — Bokaro (P2, commodity overlap)',
    'वित्तीय वर्ष 26-27 डमी गतिविधि — बोकारो (P2, वस्तु ओवरलैप)',
  ],
  [
    'FY26-27 Dummy Activity — No District Recorded',
    'वित्तीय वर्ष 26-27 डमी गतिविधि — कोई जिला दर्ज नहीं',
  ],
  [
    'FY26-27 Dummy District-Only Activity — Deoghar (no programme)',
    'वित्तीय वर्ष 26-27 डमी केवल-जिला गतिविधि — देवघर (कोई कार्यक्रम नहीं)',
  ],
  [
    'FY26-27 Dummy Field Visit — Jamtara (P1, missing attendance)',
    'वित्तीय वर्ष 26-27 डमी क्षेत्र भ्रमण — जामताड़ा (P1, उपस्थिति उपलब्ध नहीं)',
  ],
  [
    'FY26-27 Dummy Meeting — Jamtara (P3, partial toolkit B)',
    'वित्तीय वर्ष 26-27 डमी बैठक — जामताड़ा (P3, आंशिक टूलकिट B)',
  ],
  [
    'FY26-27 Dummy Meeting — Ranchi (P3, partial toolkit A)',
    'वित्तीय वर्ष 26-27 डमी बैठक — रांची (P3, आंशिक टूलकिट A)',
  ],
  ['FY26-27 Dummy Training — Ranchi (P1)', 'वित्तीय वर्ष 26-27 डमी प्रशिक्षण — रांची (P1)'],
  ['FY26-27 Dummy Workshop — Deoghar (P2)', 'वित्तीय वर्ष 26-27 डमी कार्यशाला — देवघर (P2)'],
]);

const districtNames: Record<string, string> = {
  Bokaro: 'बोकारो',
  Chatra: 'चतरा',
  Deoghar: 'देवघर',
  Dhanbad: 'धनबाद',
  Dumka: 'दुमका',
  'East Singhbhum': 'पूर्वी सिंहभूम',
  Garhwa: 'गढ़वा',
  Giridih: 'गिरिडीह',
  Godda: 'गोड्डा',
  Gumla: 'गुमला',
  Hazaribagh: 'हजारीबाग',
  Jamtara: 'जामताड़ा',
  Khunti: 'खूंटी',
  Koderma: 'कोडरमा',
  Latehar: 'लातेहार',
  Lohardaga: 'लोहरदगा',
  Pakur: 'पाकुड़',
  Palamu: 'पलामू',
  Ramgarh: 'रामगढ़',
  Ranchi: 'रांची',
  Sahibganj: 'साहिबगंज',
  'Seraikela Kharsawan': 'सरायकेला-खरसावां',
  Simdega: 'सिमडेगा',
  'West Singhbhum': 'पश्चिमी सिंहभूम',
};

const commodityNames: Record<string, string> = {
  Honey: 'शहद',
  Karanj: 'करंज',
  Lac: 'लाख',
  'Ragi / Millets': 'रागी / मोटा अनाज',
  'Sal Seed': 'साल बीज',
  Tamarind: 'इमली',
};

const statusNames: Record<string, string> = {
  cancelled: 'रद्द',
  completed: 'पूर्ण',
  ongoing: 'जारी',
  postponed: 'स्थगित',
  scheduled: 'निर्धारित',
};

const publicationTypeNames: Record<string, string> = {
  'Bye-Laws': 'उपविधि',
  'Gap Study': 'अंतराल अध्ययन',
  Guidelines: 'दिशानिर्देश',
  Notice: 'सूचना',
  'Public Announcement': 'सार्वजनिक घोषणा',
  Reports: 'प्रतिवेदन',
  'Training Material': 'प्रशिक्षण सामग्री',
};

function patternedTranslation(value: string): string | null {
  let match: RegExpMatchArray | null;

  match = value.match(/^Demo Digital Service (\d+)$/);
  if (match) return `डेमो डिजिटल सेवा ${match[1]}`;

  match = value.match(/^Demo (.+) Publication (\d+)$/);
  if (match && publicationTypeNames[match[1]!]) {
    return `डेमो ${publicationTypeNames[match[1]!]} प्रकाशन ${match[2]}`;
  }

  match = value.match(/^Fictional (.+) reference document for API testing\.$/);
  if (match && commodityNames[titleCase(match[1]!)]) {
    return `API परीक्षण के लिए काल्पनिक ${commodityNames[titleCase(match[1]!)]} संदर्भ दस्तावेज़।`;
  }

  match = value.match(/^Fixture field (\d+)$/);
  if (match) return `परीक्षण फ़ील्ड ${match[1]}`;

  match = value.match(/^Demo News: Cooperative Activity (\d+) Completed$/);
  if (match) return `डेमो समाचार: सहकारी गतिविधि ${match[1]} पूर्ण हुई`;

  match = value.match(
    /^Fictional (cancelled|completed|ongoing|postponed|scheduled) event in (.+) for listing, filter, and detail tests\.$/,
  );
  if (match && statusNames[match[1]!] && districtNames[match[2]!]) {
    return `सूची, फ़िल्टर और विवरण परीक्षणों के लिए ${districtNames[match[2]!]} में काल्पनिक ${statusNames[match[1]!]} कार्यक्रम।`;
  }

  match = value.match(/^Demo (Honey|Sal Seed|Tamarind) Cooperative Activity (\d+)$/);
  if (match) return `डेमो ${commodityNames[match[1]!]} सहकारी गतिविधि ${match[2]}`;

  match = value.match(/^How does fictional CMS feature (\d+) work\?$/);
  if (match) return `काल्पनिक CMS सुविधा ${match[1]} कैसे काम करती है?`;

  match = value.match(/^Demo Field Activity Gallery (\d+)$/);
  if (match) return `डेमो क्षेत्रीय गतिविधि गैलरी ${match[1]}`;

  match = value.match(/^Fictional activity image (\d+)$/);
  if (match) return `काल्पनिक गतिविधि चित्र ${match[1]}`;

  match = value.match(/^Test Campus (\d+), (.+), Jharkhand$/);
  if (match && districtNames[match[2]!])
    return `परीक्षण परिसर ${match[1]}, ${districtNames[match[2]!]}, झारखंड`;

  match = value.match(/^Fictional partner institution supporting (.+) livelihoods\.$/);
  if (match && commodityNames[titleCase(match[1]!)]) {
    return `${commodityNames[titleCase(match[1]!)]} आधारित आजीविका में सहयोग करने वाली काल्पनिक साझेदार संस्था।`;
  }

  match = value.match(/^Demo (.+) Cooperative Institution (\d+)$/);
  if (match && districtNames[match[1]!])
    return `डेमो ${districtNames[match[1]!]} सहकारी संस्था ${match[2]}`;

  match = value.match(/^Fictional communication content covering (.+)\.$/);
  if (match && commodityNames[match[1]!])
    return `${commodityNames[match[1]!]} से संबंधित काल्पनिक संचार सामग्री।`;

  match = value.match(/^Demo communication record (\d+)$/);
  if (match) return `डेमो संचार अभिलेख ${match[1]}`;

  match = value.match(/^Fictional procurement content covering (.+)\.$/);
  if (match && commodityNames[match[1]!])
    return `${commodityNames[match[1]!]} से संबंधित काल्पनिक खरीद सामग्री।`;

  match = value.match(/^Demo procurement record (\d+)$/);
  if (match) return `डेमो खरीद अभिलेख ${match[1]}`;

  match = value.match(/^Demo (Honey|Sal Seed|Tamarind) Enterprise Programme (\d+)$/);
  if (match) return `डेमो ${commodityNames[match[1]!]} उद्यम कार्यक्रम ${match[2]}`;

  match = value.match(/^Fictional tender content covering (.+)\.$/);
  if (match && commodityNames[match[1]!])
    return `${commodityNames[match[1]!]} से संबंधित काल्पनिक निविदा सामग्री।`;

  match = value.match(/^Demo tender record (\d+)$/);
  if (match) return `डेमो निविदा अभिलेख ${match[1]}`;

  match = value.match(/^Demo (Honey|Sal Seed|Tamarind) Starter Toolkit (\d+)$/);
  if (match) return `डेमो ${commodityNames[match[1]!]} प्रारंभिक टूलकिट ${match[2]}`;

  match = value.match(/^Demo Cooperative Video (\d+)$/);
  if (match) return `डेमो सहकारी वीडियो ${match[1]}`;

  return null;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function translate(value: string): string | null {
  return exact.get(value) ?? patternedTranslation(value);
}

async function pairedColumns(): Promise<Pair[]> {
  return prisma.$queryRawUnsafe<Pair[]>(`
    SELECT english.table_name AS table,
           english.column_name AS en,
           replace(english.column_name, '_en', '_hi') AS hi
      FROM information_schema.columns english
      JOIN information_schema.columns hindi
        ON hindi.table_schema = english.table_schema
       AND hindi.table_name = english.table_name
       AND hindi.column_name = replace(english.column_name, '_en', '_hi')
     WHERE english.table_schema = 'public'
       AND english.column_name LIKE '%\\_en' ESCAPE '\\'
     ORDER BY english.table_name, english.column_name
  `);
}

async function missingValues(pairs: Pair[]): Promise<MissingValue[]> {
  const missing: MissingValue[] = [];
  for (const pair of pairs) {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string; rows: number }>>(
      `SELECT ${quote(pair.en)} AS value, count(*)::int AS rows
         FROM ${quote(pair.table)}
        WHERE ${quote(pair.en)} IS NOT NULL
          AND btrim(${quote(pair.en)}) <> ''
          AND (${quote(pair.hi)} IS NULL OR btrim(${quote(pair.hi)}) = '')
        GROUP BY ${quote(pair.en)}
        ORDER BY ${quote(pair.en)}`,
    );
    missing.push(...rows.map((row) => ({ ...pair, ...row })));
  }
  return missing;
}

async function main(): Promise<void> {
  const missing = await missingValues(await pairedColumns());
  const planned = missing.map((item) => ({ ...item, translation: translate(item.value) }));
  const unrecognised = planned.filter((item) => item.translation === null);
  const rowCount = planned.reduce((sum, item) => sum + item.rows, 0);

  console.log(
    `${apply ? 'APPLY' : 'DRY RUN'}: ${rowCount} blank Hindi fields across ${planned.length} unique English values.`,
  );

  if (unrecognised.length > 0) {
    console.error(
      `Refusing to continue: ${unrecognised.length} English values do not have reviewed Hindi translations.`,
    );
    for (const item of unrecognised) console.error(`- ${item.table}.${item.en}: ${item.value}`);
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log('All values are covered. Re-run with --apply to commit the backfill.');
    return;
  }

  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of planned) {
      updated += await tx.$executeRawUnsafe(
        `UPDATE ${quote(item.table)}
            SET ${quote(item.hi)} = $1
          WHERE ${quote(item.en)} = $2
            AND (${quote(item.hi)} IS NULL OR btrim(${quote(item.hi)}) = '')`,
        item.translation,
        item.value,
      );
    }
  });

  const remaining = await missingValues(await pairedColumns());
  console.log(
    `Updated ${updated} fields. Remaining blank Hindi fields with English content: ${remaining.reduce((sum, item) => sum + item.rows, 0)}.`,
  );
  if (remaining.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
