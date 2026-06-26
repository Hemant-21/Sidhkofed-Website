/**
 * UI string dictionary. Editorial content is bilingual via API `*_en`/`*_hi`
 * fields; this dictionary only covers interface chrome (labels, buttons, states).
 * English is primary, Hindi optional (codex §10). Keep keys flat and stable.
 */

export type Language = 'en' | 'hi';

export const LANGUAGES: Language[] = ['en', 'hi'];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

type Dict = Record<string, string>;

const en: Dict = {
  'site.name': 'SIDHKOFED',
  'site.fullName': 'Sidho Kanho Federation, Jharkhand',
  'site.tagline': 'Jharkhand Cooperative Federation — cooperative livelihoods, transparency and public services',
  'skip.toContent': 'Skip to main content',

  'nav.home': 'Home',
  'nav.menu': 'Menu',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.search': 'Search',

  'a11y.textSize': 'Text size',
  'a11y.increase': 'Increase text size',
  'a11y.decrease': 'Decrease text size',
  'a11y.reset': 'Reset text size',
  'a11y.language': 'Language',

  'common.readMore': 'Read more',
  'common.viewAll': 'View all',
  'common.viewDetails': 'View details',
  'common.download': 'Download',
  'common.preview': 'Preview',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.filters': 'Filters',
  'common.clearFilters': 'Clear filters',
  'common.apply': 'Apply',
  'common.all': 'All',
  'common.page': 'Page',
  'common.of': 'of',
  'common.previous': 'Previous',
  'common.next': 'Next',
  'common.results': 'results',
  'common.publishedOn': 'Published on',
  'common.opensNewTab': 'opens in a new tab',
  'common.externalLink': 'External link',
  'common.home': 'Home',

  'state.empty.title': 'Nothing to show yet',
  'state.empty.body': 'There is no published content in this section at the moment. Please check back later.',
  'state.error.title': 'Something went wrong',
  'state.error.body': 'We could not load this content. Please try again.',
  'state.error.retry': 'Try again',
  'state.notFound.title': 'Page not found',
  'state.notFound.body': 'The page you are looking for may have been moved, archived, or never existed.',
  'state.notFound.cta': 'Go to homepage',
  'state.serverError.title': 'Service temporarily unavailable',
  'state.serverError.body': 'We are experiencing a problem. Please try again shortly.',

  'translation.automatic': 'Automatically translated',

  'search.placeholder': 'Search events, news, documents…',
  'search.title': 'Search',
  'search.resultsFor': 'Results for',
  'search.noResults': 'No results found',
  'search.filterType': 'Content type',

  'home.hero.cta.services': 'Digital services',
  'home.hero.cta.dashboard': 'Public dashboard',
  'home.section.news': 'Latest news',
  'home.section.events': 'Featured events',
  'home.section.programmes': 'Programmes & schemes',
  'home.section.communications': 'Official communications',
  'home.section.tenders': 'Active tenders',
  'home.section.documents': 'Knowledge centre',
  'home.section.partners': 'Partners & institutions',
  'home.section.services': 'Digital services',
  'home.section.dashboard': 'Impact at a glance',
  'home.section.quickLinks': 'Quick links',

  'events.upcoming': 'Upcoming',
  'events.past': 'Past events',
  'doc.knowledgeCentre': 'Knowledge centre',
  'contact.title': 'Contact',
  'contact.formUnavailable': 'This enquiry form is a prototype and is not yet live. Submission is currently unavailable.',
  'footer.importantLinks': 'Important links',
  'footer.about': 'About',
  'footer.copyright': 'SIDHKOFED. All rights reserved.',
  'footer.prototypeNotice': 'Representative prototype content — official data pending approval.',
};

const hi: Dict = {
  'site.name': 'सिधकोफेड',
  'site.fullName': 'सिधो कान्हो फेडरेशन, झारखंड',
  'site.tagline': 'झारखंड सहकारी फेडरेशन — सहकारी आजीविका, पारदर्शिता और जनसेवाएँ',
  'skip.toContent': 'मुख्य सामग्री पर जाएँ',

  'nav.home': 'मुख पृष्ठ',
  'nav.menu': 'मेन्यू',
  'nav.openMenu': 'मेन्यू खोलें',
  'nav.closeMenu': 'मेन्यू बंद करें',
  'nav.search': 'खोजें',

  'a11y.textSize': 'पाठ आकार',
  'a11y.increase': 'पाठ आकार बढ़ाएँ',
  'a11y.decrease': 'पाठ आकार घटाएँ',
  'a11y.reset': 'पाठ आकार रीसेट करें',
  'a11y.language': 'भाषा',

  'common.readMore': 'और पढ़ें',
  'common.viewAll': 'सभी देखें',
  'common.viewDetails': 'विवरण देखें',
  'common.download': 'डाउनलोड',
  'common.preview': 'पूर्वावलोकन',
  'common.back': 'वापस',
  'common.loading': 'लोड हो रहा है…',
  'common.filters': 'फ़िल्टर',
  'common.clearFilters': 'फ़िल्टर हटाएँ',
  'common.apply': 'लागू करें',
  'common.all': 'सभी',
  'common.page': 'पृष्ठ',
  'common.of': 'का',
  'common.previous': 'पिछला',
  'common.next': 'अगला',
  'common.results': 'परिणाम',
  'common.publishedOn': 'प्रकाशित',
  'common.opensNewTab': 'नई विंडो में खुलता है',
  'common.externalLink': 'बाहरी लिंक',
  'common.home': 'मुख पृष्ठ',

  'state.empty.title': 'अभी कुछ नहीं',
  'state.empty.body': 'इस अनुभाग में फ़िलहाल कोई प्रकाशित सामग्री नहीं है। कृपया बाद में देखें।',
  'state.error.title': 'कुछ गड़बड़ हुई',
  'state.error.body': 'हम यह सामग्री लोड नहीं कर सके। कृपया पुनः प्रयास करें।',
  'state.error.retry': 'पुनः प्रयास करें',
  'state.notFound.title': 'पृष्ठ नहीं मिला',
  'state.notFound.body': 'जिस पृष्ठ की आप तलाश कर रहे हैं वह स्थानांतरित, संग्रहीत या मौजूद नहीं हो सकता।',
  'state.notFound.cta': 'मुख पृष्ठ पर जाएँ',
  'state.serverError.title': 'सेवा अस्थायी रूप से अनुपलब्ध',
  'state.serverError.body': 'कोई समस्या आ रही है। कृपया थोड़ी देर बाद प्रयास करें।',

  'translation.automatic': 'स्वचालित अनुवाद',

  'search.placeholder': 'कार्यक्रम, समाचार, दस्तावेज़ खोजें…',
  'search.title': 'खोजें',
  'search.resultsFor': 'इसके परिणाम',
  'search.noResults': 'कोई परिणाम नहीं मिला',
  'search.filterType': 'सामग्री प्रकार',

  'home.hero.cta.services': 'डिजिटल सेवाएँ',
  'home.hero.cta.dashboard': 'सार्वजनिक डैशबोर्ड',
  'home.section.news': 'ताज़ा समाचार',
  'home.section.events': 'विशेष कार्यक्रम',
  'home.section.programmes': 'कार्यक्रम एवं योजनाएँ',
  'home.section.communications': 'आधिकारिक सूचनाएँ',
  'home.section.tenders': 'सक्रिय निविदाएँ',
  'home.section.documents': 'ज्ञान केंद्र',
  'home.section.partners': 'साझेदार एवं संस्थान',
  'home.section.services': 'डिजिटल सेवाएँ',
  'home.section.dashboard': 'एक नज़र में प्रभाव',
  'home.section.quickLinks': 'त्वरित लिंक',

  'events.upcoming': 'आगामी',
  'events.past': 'पिछले कार्यक्रम',
  'doc.knowledgeCentre': 'ज्ञान केंद्र',
  'contact.title': 'संपर्क',
  'contact.formUnavailable': 'यह पूछताछ फ़ॉर्म एक प्रोटोटाइप है और अभी सक्रिय नहीं है। फ़िलहाल जमा करना उपलब्ध नहीं है।',
  'footer.importantLinks': 'महत्वपूर्ण लिंक',
  'footer.about': 'परिचय',
  'footer.copyright': 'सिधकोफेड। सर्वाधिकार सुरक्षित।',
  'footer.prototypeNotice': 'प्रातिनिधिक प्रोटोटाइप सामग्री — आधिकारिक डेटा अनुमोदन हेतु लंबित।',
};

export const DICTIONARIES: Record<Language, Dict> = { en, hi };

/** Translate a UI key for a language, falling back to English then the key itself. */
export function translate(lang: Language, key: string): string {
  return DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key;
}
