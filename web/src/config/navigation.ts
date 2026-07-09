export interface NavItem {
  key: string;
  labelEn: string;
  labelHi: string;
  href: string;
  children?: NavItem[];
  external?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { key: 'home', labelEn: 'Home', labelHi: 'होम', href: '/' },
  {
    key: 'about',
    labelEn: 'About Us',
    labelHi: 'हमारे बारे में',
    href: '/about',
  },
  {
    key: 'activities',
    labelEn: 'Activities',
    labelHi: 'गतिविधियाँ',
    href: '/activities',
  },
  {
    key: 'membership',
    labelEn: 'Membership',
    labelHi: 'सदस्यता',
    href: '/membership',
  },
  {
    key: 'procurement',
    labelEn: 'Procurement',
    labelHi: 'खरीद',
    href: '/procurement',
  },
  {
    key: 'impact',
    labelEn: 'Impact',
    labelHi: 'प्रभाव',
    href: '/impact',
  },
  {
    key: 'publications',
    labelEn: 'Publications',
    labelHi: 'प्रकाशन',
    href: '/publications',
  },
  {
    key: 'notifications',
    labelEn: 'Notifications',
    labelHi: 'सूचनाएं',
    href: '/notifications',
  },
];

export const FOOTER_NAV = {
  about: [
    { key: 'f-about', labelEn: 'About SIDHKOFED', labelHi: 'SIDHKOFED के बारे में', href: '/about' },
    { key: 'f-membership', labelEn: 'Membership', labelHi: 'सदस्यता', href: '/membership' },
  ],
  resources: [
    { key: 'f-publications', labelEn: 'Publications', labelHi: 'प्रकाशन', href: '/publications' },
    {
      key: 'f-procurement',
      labelEn: 'Procurement Announcements',
      labelHi: 'खरीद घोषणाएं',
      href: '/procurement/announcements',
    },
    { key: 'f-tenders', labelEn: 'Tenders', labelHi: 'निविदाएं', href: '/notifications/tenders' },
    { key: 'f-dashboard', labelEn: 'Impact Dashboard', labelHi: 'प्रभाव डैशबोर्ड', href: '/impact/dashboard' },
  ],
  important: [
    {
      key: 'f-rti',
      labelEn: 'RTI',
      labelHi: 'सूचना का अधिकार',
      href: 'https://rtionline.gov.in/',
      external: true,
    },
    { key: 'f-digital', labelEn: 'Digital Services', labelHi: 'डिजिटल सेवाएं', href: '/digital-services' },
    { key: 'f-privacy', labelEn: 'Privacy Policy', labelHi: 'गोपनीयता नीति', href: '/privacy-policy' },
    { key: 'f-disclaimer', labelEn: 'Disclaimer', labelHi: 'अस्वीकरण', href: '/disclaimer' },
  ],
};
