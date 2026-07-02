/**
 * Registry of every publishable resource the scheduler maintains.
 *
 * One entry per model carrying the publishing-workflow mixin (16 total). Each entry binds:
 *   - `model`: the Prisma delegate name used for generic mixin DISCOVERY (scheduler.repository).
 *   - `publish`: the owning module's `service.lifecycle(id,'publish',ctx)` — so scheduled
 *     publishing REUSES the existing publish service and NEVER duplicates publish logic, audit, or
 *     cache invalidation (Phase 14 Job 1 rule).
 *
 * The scheduler is a leaf consumer (no module imports it), so importing every module service here
 * is safe — there is no import cycle. This file is the single place the "which modules support
 * scheduled publishing" list lives, mirroring the schema's publishing mixin coverage.
 */
import type { AuditContext } from '@/modules/audit/audit.service';
import type { LifecycleAction } from '@/shared/publishing';
import type { MixinModelName } from './scheduler.repository';

import { eventService } from '@/modules/events/events.service';
import { newsService } from '@/modules/events/news/news.service';
import { programmeService } from '@/modules/programmes/programmes.service';
import { documentService } from '@/modules/documents/documents.service';
import { toolkitService } from '@/modules/toolkits/toolkits.service';
import { institutionService } from '@/modules/institutions/institutions.service';
import { officialCommunicationService } from '@/modules/official-communications/official-communications.service';
import { tenderService } from '@/modules/tenders/tenders.service';
import { procurementUpdateService } from '@/modules/procurement-updates/procurement-updates.service';
import { pageService } from '@/modules/pages/pages.service';
import { faqService } from '@/modules/faqs/faqs.service';
import { digitalServiceService } from '@/modules/digital-services/digital-services.service';
import { membershipService } from '@/modules/memberships/memberships.service';
import { reportService } from '@/modules/dashboard/reports.service';
import { galleryService } from '@/modules/galleries/gallery.service';
import { videoService } from '@/modules/videos/video.service';

/** A module that exposes the standard publishing lifecycle action endpoint. */
interface LifecycleService {
  lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<unknown>;
}

export interface PublishableResource {
  /** Human/audit module key (for the scheduler's own structured logs and per-module breakdown). */
  key: string;
  /** Prisma delegate name for generic mixin discovery. */
  model: MixinModelName;
  /** Reuse the owning service's publish transition (validation + audit + cache all included). */
  publish: (id: string, ctx: AuditContext) => Promise<unknown>;
}

function resource(key: string, model: MixinModelName, service: LifecycleService): PublishableResource {
  return { key, model, publish: (id, ctx) => service.lifecycle(id, 'publish', ctx) };
}

/**
 * Every publishable resource, in dependency-tier order. Covers the modules the Phase 14 spec lists
 * for scheduled publishing (Events, News, Programmes, Toolkits, Institutions, Communications,
 * Tenders, Procurement, Pages, FAQs, Digital Services, Membership, Dashboard Reports) plus the two
 * remaining mixin-bearing media resources (Galleries, Videos) for completeness.
 */
export const PUBLISHABLE_RESOURCES: readonly PublishableResource[] = [
  resource('document', 'document', documentService),
  resource('gallery', 'gallery', galleryService),
  resource('video', 'video', videoService),
  resource('programme', 'programmeScheme', programmeService),
  resource('institution', 'institution', institutionService),
  resource('toolkit', 'toolkit', toolkitService),
  resource('event', 'event', eventService),
  resource('event_news', 'eventNews', newsService),
  resource('official_communication', 'officialCommunication', officialCommunicationService),
  resource('tender', 'tender', tenderService),
  resource('procurement_update', 'procurementUpdate', procurementUpdateService),
  resource('page', 'page', pageService),
  resource('faq', 'faq', faqService),
  resource('digital_service', 'digitalService', digitalServiceService),
  resource('institutional_membership', 'institutionalMembership', membershipService),
  resource('dashboard_report', 'dashboardReport', reportService),
] as const;
