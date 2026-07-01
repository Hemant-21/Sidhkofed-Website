/**
 * Official block seed for all 24 Jharkhand districts — 264 CD blocks.
 * Source: Government of Jharkhand, District Administration records.
 *
 * Idempotent: each block is upserted by its (districtId, nameEn) composite key.
 * Re-running updates nameHi and displayOrder without creating duplicates.
 * Slug is generated as `{district-slug}-{block-slug}` for global uniqueness.
 */
import { PrismaClient } from '@prisma/client';
import { slugify } from '@/utils/slug';

interface BlockRow {
  district: string;
  nameEn: string;
  nameHi?: string;
}

/**
 * Some source district names differ from the official names in the districts seed.
 * This map resolves them to their canonical counterpart so the lookup succeeds.
 */
const DISTRICT_ALIASES: Record<string, string> = {
  'East Singhbum':        'East Singhbhum',
  'Sahebganj':            'Sahibganj',
  'Saraikela Kharsawan':  'Seraikela Kharsawan',
};

const BLOCKS: BlockRow[] = [
  // ── Bokaro (9) ──────────────────────────────────────────────────────────────
  { district: 'Bokaro', nameEn: 'Bermo',         nameHi: 'बेरमो' },
  { district: 'Bokaro', nameEn: 'Chandankiyari', nameHi: 'चंदनकियारी' },
  { district: 'Bokaro', nameEn: 'Chandrapura',   nameHi: 'चंद्रपुरा' },
  { district: 'Bokaro', nameEn: 'Chas',          nameHi: 'चास' },
  { district: 'Bokaro', nameEn: 'Gomia',         nameHi: 'गोमिया' },
  { district: 'Bokaro', nameEn: 'Jaridih',       nameHi: 'जरीडीह' },
  { district: 'Bokaro', nameEn: 'Kasmar',        nameHi: 'कसमार' },
  { district: 'Bokaro', nameEn: 'Nawadih',       nameHi: 'नावाडीह' },
  { district: 'Bokaro', nameEn: 'Peterwar',      nameHi: 'पेटरवार' },

  // ── Chatra (12) ─────────────────────────────────────────────────────────────
  { district: 'Chatra', nameEn: 'Chatra',                                      nameHi: 'चतरा' },
  { district: 'Chatra', nameEn: 'Giddhor',                                     nameHi: 'गिद्धौर' },
  { district: 'Chatra', nameEn: 'Itkhori',                                     nameHi: 'इटखोरी' },
  { district: 'Chatra', nameEn: 'Kanhachatti',                                 nameHi: 'कान्हाचट्टी' },
  { district: 'Chatra', nameEn: 'Kunda',                                       nameHi: 'कुंदा' },
  { district: 'Chatra', nameEn: 'Lawalong',                                    nameHi: 'लावालौंग' },
  { district: 'Chatra', nameEn: 'Mayurhand',                                   nameHi: 'मयूरहंड' },
  { district: 'Chatra', nameEn: 'Pathalgada',                                  nameHi: 'पत्थलगड़ा' },
  { district: 'Chatra', nameEn: 'Pratappur',                                   nameHi: 'प्रतापपुर' },
  { district: 'Chatra', nameEn: 'Shaligram Ram Narayanpur Alias Hunterganj',   nameHi: 'शालीग्राम राम नारायणपुर उर्फ हंटरगंज' },
  { district: 'Chatra', nameEn: 'Simaria',                                     nameHi: 'सिमरिया' },
  { district: 'Chatra', nameEn: 'Tandwa',                                      nameHi: 'टंडवा' },

  // ── Deoghar (10) ────────────────────────────────────────────────────────────
  { district: 'Deoghar', nameEn: 'Deoghar',      nameHi: 'देवघर' },
  { district: 'Deoghar', nameEn: 'Devipur',      nameHi: 'देवीपुर' },
  { district: 'Deoghar', nameEn: 'Karown',       nameHi: 'करौं' },
  { district: 'Deoghar', nameEn: 'Madhupur',     nameHi: 'मधुपुर' },
  { district: 'Deoghar', nameEn: 'Margomunda',   nameHi: 'मारगोमुंडा' },
  { district: 'Deoghar', nameEn: 'Mohanpur',     nameHi: 'मोहनपुर' },
  { district: 'Deoghar', nameEn: 'Palojori',     nameHi: 'पालोजोरी' },
  { district: 'Deoghar', nameEn: 'Sarath',       nameHi: 'सारठ' },
  { district: 'Deoghar', nameEn: 'Sarwan',       nameHi: 'सारवां' },
  { district: 'Deoghar', nameEn: 'Sonaraithari', nameHi: 'सोनारायठाढ़ी' },

  // ── Dhanbad (10) ────────────────────────────────────────────────────────────
  { district: 'Dhanbad', nameEn: 'Baghmara',    nameHi: 'बाघमारा' },
  { district: 'Dhanbad', nameEn: 'Baliapur',    nameHi: 'बलियापुर' },
  { district: 'Dhanbad', nameEn: 'Dhanbad',     nameHi: 'धनबाद' },
  { district: 'Dhanbad', nameEn: 'Egarkund',    nameHi: 'एगारकुंड' },
  { district: 'Dhanbad', nameEn: 'Govindpur',   nameHi: 'गोविंदपुर' },
  { district: 'Dhanbad', nameEn: 'Kaliasol',    nameHi: 'कलियासोल' },
  { district: 'Dhanbad', nameEn: 'Nirsa',       nameHi: 'निरसा' },
  { district: 'Dhanbad', nameEn: 'Purvi Tundi', nameHi: 'पूर्वी टुंडी' },
  { district: 'Dhanbad', nameEn: 'Topchanchi',  nameHi: 'तोपचांची' },
  { district: 'Dhanbad', nameEn: 'Tundi',       nameHi: 'टुंडी' },

  // ── Dumka (10) ──────────────────────────────────────────────────────────────
  { district: 'Dumka', nameEn: 'Dumka',       nameHi: 'दुमका' },
  { district: 'Dumka', nameEn: 'Gopikander',  nameHi: 'गोपीकांदर' },
  { district: 'Dumka', nameEn: 'Jama',        nameHi: 'जामा' },
  { district: 'Dumka', nameEn: 'Jarmundi',    nameHi: 'जरमुंडी' },
  { district: 'Dumka', nameEn: 'Kathikund',   nameHi: 'काठीकुंड' },
  { district: 'Dumka', nameEn: 'Masaliya',    nameHi: 'मसलिया' },
  { district: 'Dumka', nameEn: 'Ramgarh',     nameHi: 'रामगढ़' },
  { district: 'Dumka', nameEn: 'Ranishwar',   nameHi: 'रानीश्वर' },
  { district: 'Dumka', nameEn: 'Saraiyahat',  nameHi: 'सरैयाहाट' },
  { district: 'Dumka', nameEn: 'Sikaripara',  nameHi: 'शिकारीपाड़ा' },

  // ── East Singhbhum (11) — alias: 'East Singhbum' → 'East Singhbhum' ────────
  { district: 'East Singhbum', nameEn: 'Bahragora',           nameHi: 'बहरागोड़ा' },
  { district: 'East Singhbum', nameEn: 'Boram',               nameHi: 'बोड़ाम' },
  { district: 'East Singhbum', nameEn: 'Chakulia',            nameHi: 'चाकुलिया' },
  { district: 'East Singhbum', nameEn: 'Dhalbhumgarh',        nameHi: 'धालभूमगढ़' },
  { district: 'East Singhbum', nameEn: 'Dumaria',             nameHi: 'डुमरिया' },
  { district: 'East Singhbum', nameEn: 'Ghatshila',           nameHi: 'घाटशिला' },
  { district: 'East Singhbum', nameEn: 'Golmuri Cum Jugsalai', nameHi: 'गोलमुरी-सह-जुगसलाई' },
  { district: 'East Singhbum', nameEn: 'Gurabanda',           nameHi: 'गुड़ाबांदा' },
  { district: 'East Singhbum', nameEn: 'Musabani',            nameHi: 'मुसाबनी' },
  { district: 'East Singhbum', nameEn: 'Patamda',             nameHi: 'पटमदा' },
  { district: 'East Singhbum', nameEn: 'Potka',               nameHi: 'पोटका' },

  // ── Garhwa (20) ─────────────────────────────────────────────────────────────
  { district: 'Garhwa', nameEn: 'Bardiha',     nameHi: 'बरडीहा' },
  { district: 'Garhwa', nameEn: 'Bargad',      nameHi: 'बड़गड़' },
  { district: 'Garhwa', nameEn: 'Bhandaria',   nameHi: 'भंडरिया' },
  { district: 'Garhwa', nameEn: 'Bhawnathpur', nameHi: 'भवनाथपुर' },
  { district: 'Garhwa', nameEn: 'Bishunpura',  nameHi: 'विशुनपुरा' },
  { district: 'Garhwa', nameEn: 'Chinia',      nameHi: 'चिनिया' },
  { district: 'Garhwa', nameEn: 'Danda',       nameHi: 'डंडा' },
  { district: 'Garhwa', nameEn: 'Dandai',      nameHi: 'डंडई' },
  { district: 'Garhwa', nameEn: 'Dhurki',      nameHi: 'धुरकी' },
  { district: 'Garhwa', nameEn: 'Garhwa',      nameHi: 'गढ़वा' },
  { district: 'Garhwa', nameEn: 'Kandi',       nameHi: 'कांडी' },
  { district: 'Garhwa', nameEn: 'Ketar',       nameHi: 'केतार' },
  { district: 'Garhwa', nameEn: 'Kharaundhi',  nameHi: 'खरौंधी' },
  { district: 'Garhwa', nameEn: 'Manjhiaon',   nameHi: 'मझिआंव' },
  { district: 'Garhwa', nameEn: 'Meral',       nameHi: 'मेराल' },
  { district: 'Garhwa', nameEn: 'Nagar Untari', nameHi: 'नगर उंटारी' },
  { district: 'Garhwa', nameEn: 'Ramkanda',    nameHi: 'रामकंडा' },
  { district: 'Garhwa', nameEn: 'Ramna',       nameHi: 'रमना' },
  { district: 'Garhwa', nameEn: 'Ranka',       nameHi: 'रंका' },
  { district: 'Garhwa', nameEn: 'Sagma',       nameHi: 'सगमा' },

  // ── Giridih (13) ────────────────────────────────────────────────────────────
  { district: 'Giridih', nameEn: 'Bagodar',  nameHi: 'बगोदर' },
  { district: 'Giridih', nameEn: 'Bengabad', nameHi: 'बेंगाबाद' },
  { district: 'Giridih', nameEn: 'Birni',    nameHi: 'बिरनी' },
  { district: 'Giridih', nameEn: 'Deori',    nameHi: 'देवरी' },
  { district: 'Giridih', nameEn: 'Dhanwar',  nameHi: 'धनवार' },
  { district: 'Giridih', nameEn: 'Dumri',    nameHi: 'डुमरी' },
  { district: 'Giridih', nameEn: 'Gandey',   nameHi: 'गांडेय' },
  { district: 'Giridih', nameEn: 'Gawan',    nameHi: 'गावां' },
  { district: 'Giridih', nameEn: 'Giridih',  nameHi: 'गिरिडीह' },
  { district: 'Giridih', nameEn: 'Jamua',    nameHi: 'जमुआ' },
  { district: 'Giridih', nameEn: 'Pirtand',  nameHi: 'पीरटांड़' },
  { district: 'Giridih', nameEn: 'Suriya',   nameHi: 'सरिया' },
  { district: 'Giridih', nameEn: 'Tisri',    nameHi: 'तिसरी' },

  // ── Godda (9) ───────────────────────────────────────────────────────────────
  { district: 'Godda', nameEn: 'Basantray',    nameHi: 'बसंतराय' },
  { district: 'Godda', nameEn: 'Boarijor',     nameHi: 'बोआरीजोर' },
  { district: 'Godda', nameEn: 'Godda',        nameHi: 'गोड्डा' },
  { district: 'Godda', nameEn: 'Mahagama',     nameHi: 'महागामा' },
  { district: 'Godda', nameEn: 'Meharma',      nameHi: 'मेहरमा' },
  { district: 'Godda', nameEn: 'Pathargama',   nameHi: 'पथरगामा' },
  { district: 'Godda', nameEn: 'Poraiyahat',   nameHi: 'पोड़ैयाहाट' },
  { district: 'Godda', nameEn: 'Sundarpahari', nameHi: 'सुंदरपहाड़ी' },
  { district: 'Godda', nameEn: 'Thakurgangti', nameHi: 'ठाकुरगंगटी' },

  // ── Gumla (12) ──────────────────────────────────────────────────────────────
  { district: 'Gumla', nameEn: 'Albert Ekka', nameHi: 'अल्बर्ट एक्का (जारी)' },
  { district: 'Gumla', nameEn: 'Basia',       nameHi: 'बसिया' },
  { district: 'Gumla', nameEn: 'Bharno',      nameHi: 'भरनो' },
  { district: 'Gumla', nameEn: 'Bishunpur',   nameHi: 'बिशुनपुर' },
  { district: 'Gumla', nameEn: 'Chainpur',    nameHi: 'चैनपुर' },
  { district: 'Gumla', nameEn: 'Dumri',       nameHi: 'डुमरी' },
  { district: 'Gumla', nameEn: 'Ghaghra',     nameHi: 'घाघरा' },
  { district: 'Gumla', nameEn: 'Gumla',       nameHi: 'गुमला' },
  { district: 'Gumla', nameEn: 'Kamdara',     nameHi: 'कामडारा' },
  { district: 'Gumla', nameEn: 'Palkot',      nameHi: 'पालकोट' },
  { district: 'Gumla', nameEn: 'Raidih',      nameHi: 'रायडीह' },
  { district: 'Gumla', nameEn: 'Sisai',       nameHi: 'सिसई' },

  // ── Hazaribagh (16) ─────────────────────────────────────────────────────────
  { district: 'Hazaribagh', nameEn: 'Barhi',       nameHi: 'बरही' },
  { district: 'Hazaribagh', nameEn: 'Barkagaon',   nameHi: 'बड़कागांव' },
  { district: 'Hazaribagh', nameEn: 'Barkatha',    nameHi: 'बरकट्ठा' },
  { district: 'Hazaribagh', nameEn: 'Bishnugarh',  nameHi: 'विष्णुगढ़' },
  { district: 'Hazaribagh', nameEn: 'Chalkusha',   nameHi: 'चलकुशा' },
  { district: 'Hazaribagh', nameEn: 'Chouparan',   nameHi: 'चौपारण' },
  { district: 'Hazaribagh', nameEn: 'Churchu',     nameHi: 'चुरचू' },
  { district: 'Hazaribagh', nameEn: 'Dadi',        nameHi: 'दाड़ी' },
  { district: 'Hazaribagh', nameEn: 'Daru',        nameHi: 'दारू' },
  { district: 'Hazaribagh', nameEn: 'Ichak',       nameHi: 'इचाक' },
  { district: 'Hazaribagh', nameEn: 'Katkamdag',   nameHi: 'कटकमदाग' },
  { district: 'Hazaribagh', nameEn: 'Katkamsandi', nameHi: 'कटकमसांडी' },
  { district: 'Hazaribagh', nameEn: 'Keredari',    nameHi: 'केरेडारी' },
  { district: 'Hazaribagh', nameEn: 'Padma',       nameHi: 'पदमा' },
  { district: 'Hazaribagh', nameEn: 'Sadar',       nameHi: 'सदर' },
  { district: 'Hazaribagh', nameEn: 'Tatijhariya', nameHi: 'टाटीझरिया' },

  // ── Jamtara (6) ─────────────────────────────────────────────────────────────
  { district: 'Jamtara', nameEn: 'Fatehpur',                 nameHi: 'फतेहपुर' },
  { district: 'Jamtara', nameEn: 'Jamtara',                  nameHi: 'जामताड़ा' },
  { district: 'Jamtara', nameEn: 'Karmatanr Vidyasagar',     nameHi: 'करमाटांड़ विद्यासागर' },
  { district: 'Jamtara', nameEn: 'Kundhit',                  nameHi: 'कुंडहित' },
  { district: 'Jamtara', nameEn: 'Nala',                     nameHi: 'नाला' },
  { district: 'Jamtara', nameEn: 'Narayanpur',               nameHi: 'नारायणपुर' },

  // ── Khunti (6) ──────────────────────────────────────────────────────────────
  { district: 'Khunti', nameEn: 'Arki',   nameHi: 'अड़की' },
  { district: 'Khunti', nameEn: 'Karra',  nameHi: 'कर्रा' },
  { district: 'Khunti', nameEn: 'Khunti', nameHi: 'खूंटी' },
  { district: 'Khunti', nameEn: 'Murhu',  nameHi: 'मुरहू' },
  { district: 'Khunti', nameEn: 'Rania',  nameHi: 'रनिया' },
  { district: 'Khunti', nameEn: 'Torpa',  nameHi: 'तोरपा' },

  // ── Koderma (6) ─────────────────────────────────────────────────────────────
  { district: 'Koderma', nameEn: 'Chandwara', nameHi: 'चंदवारा' },
  { district: 'Koderma', nameEn: 'Domchanch', nameHi: 'डोमचांच' },
  { district: 'Koderma', nameEn: 'Jainagar',  nameHi: 'जयनगर' },
  { district: 'Koderma', nameEn: 'Koderma',   nameHi: 'कोडरमा' },
  { district: 'Koderma', nameEn: 'Markacho',  nameHi: 'मरकच्चो' },
  { district: 'Koderma', nameEn: 'Satgawan',  nameHi: 'सतगावां' },

  // ── Latehar (10) ────────────────────────────────────────────────────────────
  { district: 'Latehar', nameEn: 'Balumath',  nameHi: 'बालूमाथ' },
  { district: 'Latehar', nameEn: 'Bariyatu',  nameHi: 'बारियातू' },
  { district: 'Latehar', nameEn: 'Barwadih',  nameHi: 'बरवाडीह' },
  { district: 'Latehar', nameEn: 'Chandwa',   nameHi: 'चंदवा' },
  { district: 'Latehar', nameEn: 'Garu',      nameHi: 'गारू' },
  { district: 'Latehar', nameEn: 'Herhanj',   nameHi: 'हेरहंज' },
  { district: 'Latehar', nameEn: 'Latehar',   nameHi: 'लातेहार' },
  { district: 'Latehar', nameEn: 'Mahuadanr', nameHi: 'महुआडांड़' },
  { district: 'Latehar', nameEn: 'Manika',    nameHi: 'मनिका' },
  { district: 'Latehar', nameEn: 'Saryu',     nameHi: 'सरयू' },

  // ── Lohardaga (7) ───────────────────────────────────────────────────────────
  { district: 'Lohardaga', nameEn: 'Bhandra',   nameHi: 'भंडरा' },
  { district: 'Lohardaga', nameEn: 'Kairo',     nameHi: 'कैरो' },
  { district: 'Lohardaga', nameEn: 'Kisko',     nameHi: 'किस्को' },
  { district: 'Lohardaga', nameEn: 'Kuru',      nameHi: 'कुड़ू' },
  { district: 'Lohardaga', nameEn: 'Lohardaga', nameHi: 'लोहरदगा' },
  { district: 'Lohardaga', nameEn: 'Peshrar',   nameHi: 'पेशरार' },
  { district: 'Lohardaga', nameEn: 'Senha',     nameHi: 'सेन्हा' },

  // ── Pakur (6) ───────────────────────────────────────────────────────────────
  { district: 'Pakur', nameEn: 'Amrapara',  nameHi: 'आमड़ापाड़ा' },
  { district: 'Pakur', nameEn: 'Hiranpur',  nameHi: 'हिरणपुर' },
  { district: 'Pakur', nameEn: 'Littipara', nameHi: 'लिट्टीपाड़ा' },
  { district: 'Pakur', nameEn: 'Maheshpur', nameHi: 'महेशपुर' },
  { district: 'Pakur', nameEn: 'Pakur',     nameHi: 'पाकुड़' },
  { district: 'Pakur', nameEn: 'Pakuria',   nameHi: 'पाकुड़िया' },

  // ── Palamu (21) ─────────────────────────────────────────────────────────────
  { district: 'Palamu', nameEn: 'Bishrampur',    nameHi: 'विश्रामपुर' },
  { district: 'Palamu', nameEn: 'Chainpur',      nameHi: 'चैनपुर' },
  { district: 'Palamu', nameEn: 'Chhatarpur',    nameHi: 'छतरपुर' },
  { district: 'Palamu', nameEn: 'Haidernagar',   nameHi: 'हैदरनगर' },
  { district: 'Palamu', nameEn: 'Hariharganj',   nameHi: 'हरिहरगंज' },
  { district: 'Palamu', nameEn: 'Hussainabad',   nameHi: 'हुसैनाबाद' },
  { district: 'Palamu', nameEn: 'Lesliganj',     nameHi: 'लेस्लीगंज' },
  { district: 'Palamu', nameEn: 'Manatu',        nameHi: 'मनातू' },
  { district: 'Palamu', nameEn: 'Medininagar',   nameHi: 'मेदिनीनगर' },
  { district: 'Palamu', nameEn: 'Mohamadganj',   nameHi: 'मोहम्मदगंज' },
  { district: 'Palamu', nameEn: 'Nawa Bazar',    nameHi: 'नावा बाजार' },
  { district: 'Palamu', nameEn: 'Nawdiha Bazar', nameHi: 'नौडीहा बाजार' },
  { district: 'Palamu', nameEn: 'Padwa',         nameHi: 'पड़वा' },
  { district: 'Palamu', nameEn: 'Pandu',         nameHi: 'पांडू' },
  { district: 'Palamu', nameEn: 'Panki',         nameHi: 'पांकी' },
  { district: 'Palamu', nameEn: 'Patan',         nameHi: 'पाटन' },
  { district: 'Palamu', nameEn: 'Pipra',         nameHi: 'पिपरा' },
  { district: 'Palamu', nameEn: 'Ramgarh',       nameHi: 'रामगढ़' },
  { district: 'Palamu', nameEn: 'Satbarwa',      nameHi: 'सतबरवा' },
  { district: 'Palamu', nameEn: 'Tarhasi',       nameHi: 'तरहसी' },
  { district: 'Palamu', nameEn: 'Untari Road',   nameHi: 'उंटारी रोड' },

  // ── Ramgarh (6) ─────────────────────────────────────────────────────────────
  { district: 'Ramgarh', nameEn: 'Chitarpur', nameHi: 'चितरपुर' },
  { district: 'Ramgarh', nameEn: 'Dulmi',     nameHi: 'दुलमी' },
  { district: 'Ramgarh', nameEn: 'Gola',      nameHi: 'गोला' },
  { district: 'Ramgarh', nameEn: 'Mandu',     nameHi: 'मांडू' },
  { district: 'Ramgarh', nameEn: 'Patratu',   nameHi: 'पतरातू' },
  { district: 'Ramgarh', nameEn: 'Ramgarh',   nameHi: 'रामगढ़' },

  // ── Ranchi (18) ─────────────────────────────────────────────────────────────
  { district: 'Ranchi', nameEn: 'Angara',   nameHi: 'अनगड़ा' },
  { district: 'Ranchi', nameEn: 'Bero',     nameHi: 'बेड़ो' },
  { district: 'Ranchi', nameEn: 'Bundu',    nameHi: 'बुंडू' },
  { district: 'Ranchi', nameEn: 'Burmu',    nameHi: 'बुढ़मू' },
  { district: 'Ranchi', nameEn: 'Chanho',   nameHi: 'चान्हो' },
  { district: 'Ranchi', nameEn: 'Itki',     nameHi: 'इटकी' },
  { district: 'Ranchi', nameEn: 'Kanke',    nameHi: 'कांके' },
  { district: 'Ranchi', nameEn: 'Khelari',  nameHi: 'खलारी' },
  { district: 'Ranchi', nameEn: 'Lapung',   nameHi: 'लापुंग' },
  { district: 'Ranchi', nameEn: 'Mandar',   nameHi: 'मांडर' },
  { district: 'Ranchi', nameEn: 'Nagri',    nameHi: 'नगड़ी' },
  { district: 'Ranchi', nameEn: 'Namkum',   nameHi: 'नामकुम' },
  { district: 'Ranchi', nameEn: 'Ormanjhi', nameHi: 'ओरमांझी' },
  { district: 'Ranchi', nameEn: 'Rahe',     nameHi: 'राहे' },
  { district: 'Ranchi', nameEn: 'Ratu',     nameHi: 'रातू' },
  { district: 'Ranchi', nameEn: 'Silli',    nameHi: 'सिल्ली' },
  { district: 'Ranchi', nameEn: 'Sonahatu', nameHi: 'सोनाहातू' },
  { district: 'Ranchi', nameEn: 'Tamar',    nameHi: 'तमाड़' },

  // ── Sahibganj (9) — alias: 'Sahebganj' → 'Sahibganj' ───────────────────────
  { district: 'Sahebganj', nameEn: 'Barhait',   nameHi: 'बरहेट' },
  { district: 'Sahebganj', nameEn: 'Barharwa',  nameHi: 'बरहरवा' },
  { district: 'Sahebganj', nameEn: 'Borio',     nameHi: 'बोरियो' },
  { district: 'Sahebganj', nameEn: 'Mandro',    nameHi: 'मंडरो' },
  { district: 'Sahebganj', nameEn: 'Pathna',    nameHi: 'पतना' },
  { district: 'Sahebganj', nameEn: 'Rajmahal',  nameHi: 'राजमहल' },
  { district: 'Sahebganj', nameEn: 'Sahibganj', nameHi: 'साहिबगंज' },
  { district: 'Sahebganj', nameEn: 'Taljhari',  nameHi: 'तालझारी' },
  { district: 'Sahebganj', nameEn: 'Udhwa',     nameHi: 'उधवा' },

  // ── Seraikela Kharsawan (9) — alias: 'Saraikela Kharsawan' ─────────────────
  { district: 'Saraikela Kharsawan', nameEn: 'Chandil',    nameHi: 'चांडिल' },
  { district: 'Saraikela Kharsawan', nameEn: 'Gamharia',   nameHi: 'गम्हरिया' },
  { district: 'Saraikela Kharsawan', nameEn: 'Ichagarh',   nameHi: 'ईचागढ़' },
  { district: 'Saraikela Kharsawan', nameEn: 'Kharsawan',  nameHi: 'खरसावां' },
  { district: 'Saraikela Kharsawan', nameEn: 'Kuchai',     nameHi: 'कुचाई' },
  { district: 'Saraikela Kharsawan', nameEn: 'Kukru',      nameHi: 'कुकड़ू' },
  { district: 'Saraikela Kharsawan', nameEn: 'Nimdih',     nameHi: 'नीमडीह' },
  { district: 'Saraikela Kharsawan', nameEn: 'Rajnagar',   nameHi: 'राजनगर' },
  { district: 'Saraikela Kharsawan', nameEn: 'Seraikella', nameHi: 'सरायकेला' },

  // ── Simdega (10) ────────────────────────────────────────────────────────────
  { district: 'Simdega', nameEn: 'Bano',          nameHi: 'बानो' },
  { district: 'Simdega', nameEn: 'Bansjore',      nameHi: 'बांसजोर' },
  { district: 'Simdega', nameEn: 'Bolba',         nameHi: 'बोलबा' },
  { district: 'Simdega', nameEn: 'Jaldega',       nameHi: 'जलडेगा' },
  { district: 'Simdega', nameEn: 'Kersai',        nameHi: 'केरसई' },
  { district: 'Simdega', nameEn: 'Kolebira',      nameHi: 'कोलेबिरा' },
  { district: 'Simdega', nameEn: 'Kurdeg',        nameHi: 'कुरडेग' },
  { district: 'Simdega', nameEn: 'Pakartanr',     nameHi: 'पाकरटांड़' },
  { district: 'Simdega', nameEn: 'Simdega',       nameHi: 'सिमडेगा' },
  { district: 'Simdega', nameEn: 'Thethaitanger', nameHi: 'ठेठईटांगर' },

  // ── West Singhbhum (18) ─────────────────────────────────────────────────────
  { district: 'West Singhbhum', nameEn: 'Anandpur',      nameHi: 'आनंदपुर' },
  { district: 'West Singhbhum', nameEn: 'Bandgaon',      nameHi: 'बंदगांव' },
  { district: 'West Singhbhum', nameEn: 'Chaibasa',      nameHi: 'चाईबासा' },
  { district: 'West Singhbhum', nameEn: 'Chakradharpur', nameHi: 'चक्रधरपुर' },
  { district: 'West Singhbhum', nameEn: 'Goelkera',      nameHi: 'गोईलकेरा' },
  { district: 'West Singhbhum', nameEn: 'Gudri',         nameHi: 'गुदड़ी' },
  { district: 'West Singhbhum', nameEn: 'Hatgamharia',   nameHi: 'हाटगम्हरिया' },
  { district: 'West Singhbhum', nameEn: 'Jagannathpur',  nameHi: 'जगन्नाथपुर' },
  { district: 'West Singhbhum', nameEn: 'Jhinkpani',     nameHi: 'झींकपानी' },
  { district: 'West Singhbhum', nameEn: 'Khuntpani',     nameHi: 'खूंटपानी' },
  { district: 'West Singhbhum', nameEn: 'Kumardungi',    nameHi: 'कुमारडुंगी' },
  { district: 'West Singhbhum', nameEn: 'Manjhari',      nameHi: 'मंझारी' },
  { district: 'West Singhbhum', nameEn: 'Manjhgaon',     nameHi: 'मझगांव' },
  { district: 'West Singhbhum', nameEn: 'Manoharpur',    nameHi: 'मनोहरपुर' },
  { district: 'West Singhbhum', nameEn: 'Noamundi',      nameHi: 'नोआमुंडी' },
  { district: 'West Singhbhum', nameEn: 'Sonua',         nameHi: 'सोनुवा' },
  { district: 'West Singhbhum', nameEn: 'Tantnagar',     nameHi: 'तांतनगर' },
  { district: 'West Singhbhum', nameEn: 'Tonto',         nameHi: 'टोंटो' },
];

export async function seedBlocks(prisma: PrismaClient): Promise<void> {
  // Load all districts once, keyed by canonical nameEn.
  const allDistricts = await prisma.district.findMany({ select: { id: true, nameEn: true, slug: true } });
  const districtByName = new Map(allDistricts.map((d) => [d.nameEn, d]));

  // Resolve aliases and group blocks by canonical district name to maintain per-district ordering.
  const grouped = new Map<string, Array<{ nameEn: string; nameHi?: string }>>();
  for (const row of BLOCKS) {
    const canonical = DISTRICT_ALIASES[row.district] ?? row.district;
    const list = grouped.get(canonical) ?? [];
    list.push({ nameEn: row.nameEn, nameHi: row.nameHi });
    grouped.set(canonical, list);
  }

  let count = 0;
  const missing: string[] = [];

  for (const [districtName, rows] of grouped.entries()) {
    const district = districtByName.get(districtName);
    if (!district) {
      missing.push(districtName);
      continue;
    }
    for (const [i, row] of rows.entries()) {
      const slug = slugify(`${district.slug}-${row.nameEn}`);
      await prisma.block.upsert({
        where: { districtId_nameEn: { districtId: district.id, nameEn: row.nameEn } },
        update: { nameHi: row.nameHi ?? null, displayOrder: i + 1 },
        create: {
          districtId: district.id,
          nameEn: row.nameEn,
          nameHi: row.nameHi ?? null,
          slug,
          displayOrder: i + 1,
        },
      });
      count += 1;
    }
  }

  if (missing.length > 0) {
    console.warn(`  ⚠ blocks: districts not found in DB — ${missing.join(', ')}`);
  }
  console.log(`  ✓ blocks: ${count}`);
}
