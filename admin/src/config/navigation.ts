/**
 * Sidebar navigation configuration — DATA, not markup. The Sidebar renders from
 * this; adding a future module's menu entry is a one-line edit here (task:
 * "menu configuration should NOT be hardcoded inside components"). Mirrors the
 * approved CMS sidebar (codex §3) and groups items into sections.
 *
 * Visibility is permission/role aware: an item with `permission` shows only when
 * the user holds it; one with `roles` shows only for those roles (an affordance —
 * the backend still enforces every action). Items with neither are always shown to
 * authenticated users. The module pages themselves are built in later phases; the
 * routes are reserved in ROUTES so entries resolve without magic strings.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarDays,
  Newspaper,
  BookOpen,
  Wrench,
  Building2,
  FileText,
  Megaphone,
  Library,
  Gavel,
  ShoppingCart,
  Trophy,
  FileStack,
  Menu as MenuIcon,
  Images,
  GalleryHorizontalEnd,
  Video,
  BadgeCheck,
  HelpCircle,
  AppWindow,
  Inbox,
  BarChart3,
  Database,
  Gauge,
  Upload,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { ROLE_KEYS } from '@/constants/permissions';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Require this permission to display (module.action). */
  permission?: string;
  /** Require any of these roles to display (affordance only). */
  roles?: string[];
  /** Nested children for future submenu expansion. */
  children?: NavItem[];
}

export interface NavSection {
  key: string;
  /** Section heading (omit for the top, ungrouped section). */
  label?: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    key: 'overview',
    items: [{ key: 'dashboard', label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard }],
  },
  {
    key: 'content',
    label: 'Content',
    items: [
      { key: 'events', label: 'Events & News', href: ROUTES.events, icon: CalendarDays },
      { key: 'news', label: 'News', href: ROUTES.news, icon: Newspaper },
      { key: 'programmes', label: 'Programmes & Schemes', href: ROUTES.programmes, icon: BookOpen },
      { key: 'toolkits', label: 'Toolkits', href: ROUTES.toolkits, icon: Wrench },
      { key: 'institutions', label: 'Partners & Institutions', href: ROUTES.institutions, icon: Building2 },
      { key: 'success-stories', label: 'Success Stories', href: ROUTES.successStories, icon: Trophy },
    ],
  },
  {
    key: 'governance',
    label: 'Governance & Transparency',
    items: [
      { key: 'documents', label: 'Documents', href: ROUTES.documents, icon: FileText },
      { key: 'knowledge-centre', label: 'Knowledge Centre', href: ROUTES.knowledgeCentre, icon: Library },
      { key: 'communications', label: 'Official Communications', href: ROUTES.communications, icon: Megaphone },
      { key: 'tenders', label: 'Tenders', href: ROUTES.tenders, icon: Gavel },
      { key: 'procurement', label: 'Procurement Updates', href: ROUTES.procurement, icon: ShoppingCart },
    ],
  },
  {
    key: 'site',
    label: 'Site Structure',
    items: [
      { key: 'pages', label: 'Pages', href: ROUTES.pages, icon: FileStack },
      { key: 'menus', label: 'Menus', href: ROUTES.menus, icon: MenuIcon },
      { key: 'faqs', label: 'FAQs', href: ROUTES.faqs, icon: HelpCircle },
      { key: 'digital-services', label: 'Digital Services', href: ROUTES.digitalServices, icon: AppWindow },
      { key: 'leadership', label: 'Leadership', href: ROUTES.leadership, icon: Users },
    ],
  },
  {
    key: 'media',
    label: 'Media',
    items: [
      { key: 'media-library', label: 'Media Library', href: ROUTES.media, icon: Images },
      { key: 'galleries', label: 'Galleries', href: ROUTES.galleries, icon: GalleryHorizontalEnd },
      { key: 'videos', label: 'Videos', href: ROUTES.videos, icon: Video },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement & Data',
    items: [
      { key: 'memberships', label: 'Institutional Membership', href: ROUTES.memberships, icon: BadgeCheck },
      { key: 'enquiries', label: 'Enquiries', href: ROUTES.enquiries, icon: Inbox },
    ],
  },
  {
    key: 'dashboard-data',
    label: 'Dashboard Data',
    items: [
      { key: 'dashboard-reports', label: 'Dashboard Reports', href: ROUTES.dashboardReports, icon: BarChart3 },
      { key: 'dashboard-datasets', label: 'Datasets', href: ROUTES.dashboardDatasets, icon: Database },
      { key: 'dashboard-metrics', label: 'Metrics', href: ROUTES.dashboardMetrics, icon: Gauge },
      // Excel import writes dashboard data — affordance gated by the manage-data grant.
      { key: 'dashboard-import', label: 'Excel Import', href: ROUTES.dashboardImport, icon: Upload, permission: 'dashboard.manage_data' },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    items: [
      { key: 'masters', label: 'Masters', href: ROUTES.masters, icon: Database },
      { key: 'users', label: 'Users', href: ROUTES.users, icon: Users, roles: [ROLE_KEYS.superAdmin] },
      { key: 'roles', label: 'Roles & Permissions', href: ROUTES.roles, icon: ShieldCheck, roles: [ROLE_KEYS.superAdmin] },
      { key: 'audit-log', label: 'Audit Log', href: ROUTES.auditLog, icon: ScrollText, roles: [ROLE_KEYS.superAdmin] },
      { key: 'settings', label: 'Settings', href: ROUTES.settings, icon: Settings, roles: [ROLE_KEYS.superAdmin] },
    ],
  },
];
