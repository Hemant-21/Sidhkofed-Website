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
    children: [
      { key: 'about-sidhkofed', labelEn: 'About SIDHKOFED', labelHi: 'SIDHKOFED के बारे में', href: '/about' },
      {
        key: 'about-vision',
        labelEn: 'Vision, Mission, Objectives & Functions',
        labelHi: 'दृष्टि, मिशन, उद्देश्य और कार्य',
        href: '/about/vision-mission-objectives-functions',
      },
      {
        key: 'about-org',
        labelEn: 'Organisation & Governance',
        labelHi: 'संगठन और शासन',
        href: '/about/organisation-governance',
      },
    ],
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
    children: [
      { key: 'membership-overview', labelEn: 'Membership Overview', labelHi: 'सदस्यता अवलोकन', href: '/membership' },
      {
        key: 'membership-sidhkofed',
        labelEn: 'SIDHKOFED Membership',
        labelHi: 'SIDHKOFED सदस्यता',
        href: '/membership/sidhkofed',
      },
      {
        key: 'membership-district',
        labelEn: 'District Union Membership',
        labelHi: 'जिला संघ सदस्यता',
        href: '/membership/district-unions',
      },
      {
        key: 'membership-directory',
        labelEn: 'Member Directory',
        labelHi: 'सदस्य निर्देशिका',
        href: '/membership/directory',
      },
      {
        key: 'membership-process',
        labelEn: 'Membership Process',
        labelHi: 'सदस्यता प्रक्रिया',
        href: '/membership/process',
      },
      {
        key: 'membership-faqs',
        labelEn: 'Membership FAQs',
        labelHi: 'सदस्यता FAQ',
        href: '/membership/faqs',
      },
    ],
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
    children: [
      {
        key: 'publications-overview',
        labelEn: 'Publications Overview',
        labelHi: 'प्रकाशन अवलोकन',
        href: '/publications',
      },
      {
        key: 'publications-reports',
        labelEn: 'Reports & Research',
        labelHi: 'रिपोर्ट और अनुसंधान',
        href: '/publications/reports-research',
      },
      {
        key: 'publications-policies',
        labelEn: 'Policies, Guidelines & SOPs',
        labelHi: 'नीतियाँ, दिशानिर्देश और SOP',
        href: '/publications/policies-guidelines-sops',
      },
      {
        key: 'publications-training',
        labelEn: 'Training Materials',
        labelHi: 'प्रशिक्षण सामग्री',
        href: '/publications/training-materials',
      },
      {
        key: 'publications-forms',
        labelEn: 'Forms & Formats',
        labelHi: 'फॉर्म और प्रारूप',
        href: '/publications/forms-formats',
      },
      {
        key: 'publications-media',
        labelEn: 'Media Gallery',
        labelHi: 'मीडिया गैलरी',
        href: '/publications/media',
      },
    ],
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
    {
      key: 'f-vision',
      labelEn: 'Vision & Mission',
      labelHi: 'दृष्टि और मिशन',
      href: '/about/vision-mission-objectives-functions',
    },
    {
      key: 'f-org',
      labelEn: 'Organisation & Governance',
      labelHi: 'संगठन और शासन',
      href: '/about/organisation-governance',
    },
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
    { key: 'f-privacy', labelEn: 'Privacy Policy', labelHi: 'गोपनीयता नीति', href: '/pages/privacy-policy' },
    { key: 'f-disclaimer', labelEn: 'Disclaimer', labelHi: 'अस्वीकरण', href: '/pages/disclaimer' },
  ],
};
