/**
 * Per-content-type presentation metadata (Phase 15.2): the entity icon, the human
 * label (singular + plural for result-group headings), and the ADMIN route the
 * result links to. Search results carry a `public_url` (the website route); the
 * CMS console instead deep-links to the corresponding admin record, so this maps
 * each backend `content_type` to its reserved admin route.
 */

import {
  CalendarDays,
  Newspaper,
  BookOpen,
  FileText,
  Megaphone,
  Gavel,
  ShoppingCart,
  FileStack,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { CONTENT_TYPES, type ContentType } from '@/types/search';

export interface ContentTypeMeta {
  type: ContentType;
  label: string;
  labelPlural: string;
  icon: LucideIcon;
  /** Reserved admin LIST route for this content type. */
  route: string;
}

export const CONTENT_TYPE_META: Record<ContentType, ContentTypeMeta> = {
  event: { type: 'event', label: 'Event', labelPlural: 'Events', icon: CalendarDays, route: ROUTES.events },
  news: { type: 'news', label: 'News', labelPlural: 'News', icon: Newspaper, route: ROUTES.news },
  programme: { type: 'programme', label: 'Programme', labelPlural: 'Programmes', icon: BookOpen, route: ROUTES.programmes },
  document: { type: 'document', label: 'Document', labelPlural: 'Documents', icon: FileText, route: ROUTES.documents },
  official_communication: {
    type: 'official_communication',
    label: 'Communication',
    labelPlural: 'Official Communications',
    icon: Megaphone,
    route: ROUTES.communications,
  },
  tender: { type: 'tender', label: 'Tender', labelPlural: 'Tenders', icon: Gavel, route: ROUTES.tenders },
  procurement_update: {
    type: 'procurement_update',
    label: 'Procurement Update',
    labelPlural: 'Procurement Updates',
    icon: ShoppingCart,
    route: ROUTES.procurement,
  },
  page: { type: 'page', label: 'Page', labelPlural: 'Pages', icon: FileStack, route: ROUTES.pages },
};

/** The admin deep-link for a single result. Detail pages land in later module phases. */
export function adminHrefForResult(type: ContentType, id: string): string {
  return `${CONTENT_TYPE_META[type].route}/${id}`;
}

/** Stable display order for result groups (mirrors the backend content-type order). */
export const CONTENT_TYPE_ORDER: ContentType[] = [...CONTENT_TYPES];
