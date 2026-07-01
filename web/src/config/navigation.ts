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
    children: [
      { key: 'activities-overview', labelEn: 'Activities Overview', labelHi: 'गतिविधियाँ अवलोकन', href: '/activities' },
      {
        key: 'activities-trainings',
        labelEn: 'Trainings & Capacity Building',
        labelHi: 'प्रशिक्षण और क्षमता निर्माण',
        href: '/activities/trainings',
      },
      {
        key: 'activities-workshops',
        labelEn: 'Workshops & Awareness Programmes',
        labelHi: 'कार्यशाला और जागरूकता कार्यक्रम',
        href: '/activities/workshops-awareness',
      },
      {
        key: 'activities-institutional',
        labelEn: 'Meetings, Visits & Institutional Events',
        labelHi: 'बैठकें, दौरे और संस्थागत कार्यक्रम',
        href: '/activities/institutional-events',
      },
      {
        key: 'activities-success',
        labelEn: 'Success Stories',
        labelHi: 'सफलता की कहानियाँ',
        href: '/activities/success-stories',
      },
    ],
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
    children: [
      {
        key: 'procurement-overview',
        labelEn: 'Procurement Overview',
        labelHi: 'खरीद अवलोकन',
        href: '/procurement',
      },
      {
        key: 'procurement-announcements',
        labelEn: 'Procurement Announcements',
        labelHi: 'खरीद घोषणाएं',
        href: '/procurement/announcements',
      },
      {
        key: 'procurement-upcoming',
        labelEn: 'Upcoming Procurements',
        labelHi: 'आगामी खरीद',
        href: '/procurement/upcoming',
      },
      {
        key: 'procurement-enquiry',
        labelEn: 'Buyer / Seller Enquiry',
        labelHi: 'खरीदार / विक्रेता पूछताछ',
        href: '/procurement/enquiry',
      },
    ],
  },
  {
    key: 'impact',
    labelEn: 'Impact',
    labelHi: 'प्रभाव',
    href: '/impact',
    children: [
      { key: 'impact-overview', labelEn: 'Impact Overview', labelHi: 'प्रभाव अवलोकन', href: '/impact' },
      {
        key: 'impact-dashboard',
        labelEn: 'Public Dashboard',
        labelHi: 'सार्वजनिक डैशबोर्ड',
        href: '/impact/dashboard',
      },
      {
        key: 'impact-training',
        labelEn: 'Training & Beneficiary Impact',
        labelHi: 'प्रशिक्षण और लाभार्थी प्रभाव',
        href: '/impact/training-beneficiaries',
      },
    ],
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
    children: [
      { key: 'notifications-notices', labelEn: 'Notices', labelHi: 'नोटिस', href: '/notifications/notices' },
      { key: 'notifications-tenders', labelEn: 'Tenders', labelHi: 'निविदाएं', href: '/notifications/tenders' },
    ],
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
