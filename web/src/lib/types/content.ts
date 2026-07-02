/**
 * Public content DTO types — mirror the backend public mappers exactly (snake_case
 * JSON). The website only consumes these read shapes; it never constructs writes.
 * Field names are taken verbatim from `src/modules/<m>/*.dto.ts`.
 */

import type {
  MasterRef,
  MediaRef,
  DocumentLinkRef,
  ProgrammeLinkRef,
  InstitutionLinkRef,
  GalleryLinkRef,
} from './api';

export interface FinancialYearRef {
  id: string;
  label: string;
}
export interface ReportingPeriodRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
}
export interface InstitutionRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
export interface DocumentRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: string;
  file_url: string;
  language: string;
  publication_date: string | null;
}
export interface DocumentFileRef {
  id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  title: string | null;
}
export interface SourceEventRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  public_url: string;
}

// ── Events ───────────────────────────────────────────────────────────────────
export interface EventSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  event_type: MasterRef;
  event_status: string;
  date_mode: string;
  start_date: string;
  end_date: string | null;
  location_text: string | null;
  district: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}
export interface EventNewsLink {
  id: string;
  slug: string;
  title_en: string;
  publication_state: string;
  news_published_at: string | null;
  public_url: string;
}
export interface EventDetail extends EventSummary {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  training_type: MasterRef | null;
  block: MasterRef | null;
  dynamic_values: Record<string, unknown>;
  outcome_summary_en: string | null;
  outcome_summary_hi: string | null;
  key_highlights: string | null;
  final_participant_count: number | null;
  completed_date: string | null;
  translation_source: string;
  commodities: MasterRef[];
  programmes: ProgrammeLinkRef[];
  institutions: InstitutionLinkRef[];
  documents: DocumentLinkRef[];
  galleries: GalleryLinkRef[];
  news: EventNewsLink[];
  published_at: string | null;
}

// ── News ─────────────────────────────────────────────────────────────────────
export interface NewsSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  cover_media: MediaRef | null;
  news_published_at: string | null;
  source_event: SourceEventRef;
  highlight_type: string | null;
  public_url: string;
}
export interface NewsDetail extends NewsSummary {
  body_en: string | null;
  body_hi: string | null;
}

// ── Programmes ───────────────────────────────────────────────────────────────
export interface ProgrammeSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}
export interface ProgrammeDetail extends ProgrammeSummary {
  description_en: string | null;
  description_hi: string | null;
  objectives_en: string | null;
  objectives_hi: string | null;
  eligibility_en: string | null;
  eligibility_hi: string | null;
  benefits_en: string | null;
  benefits_hi: string | null;
  application_process_en: string | null;
  application_process_hi: string | null;
  funding_source: string | null;
  commodities: MasterRef[];
  permitted_training_types: MasterRef[];
}

// ── Documents ────────────────────────────────────────────────────────────────
export interface DocumentSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: MasterRef;
  knowledge_category: MasterRef | null;
  financial_year: FinancialYearRef | null;
  language: string;
  publication_date: string | null;
  show_in_knowledge_centre: boolean;
  file: DocumentFileRef;
  highlight_type: string | null;
  published_at: string | null;
  public_url: string;
}
export interface DocumentDetail extends DocumentSummary {
  description_en: string | null;
  description_hi: string | null;
  commodities: MasterRef[];
  districts: MasterRef[];
}

// ── Toolkits ─────────────────────────────────────────────────────────────────
export interface ToolkitItem {
  id: string;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  unit: string | null;
  distribution_basis: string;
  default_quantity_per_unit: number | null;
  default_group_size: number | null;
  display_order: number;
}
export interface ToolkitSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  programme: ProgrammeRef | null;
  commodity: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}
export interface ToolkitDetail extends ToolkitSummary {
  description_en: string | null;
  description_hi: string | null;
  items: ToolkitItem[];
}
export interface ToolkitDistributionSummaryItem {
  id: string;
  name_en: string;
  name_hi?: string | null;
  unit: string | null;
  distribution_basis: string;
  total_quantity: number | null;
}
export interface ToolkitDistributionSummary {
  toolkit: ProgrammeRef | { slug: string; title_en: string; title_hi: string | null };
  distribution_model_breakdown: Record<string, number>;
  total_participants_covered: number | null;
  items: ToolkitDistributionSummaryItem[];
  total_quantity: number | null;
}

// ── Institutions ─────────────────────────────────────────────────────────────
export interface InstitutionSummary {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  institution_type: MasterRef;
  district: MasterRef | null;
  logo: MediaRef | null;
  website_url: string | null;
  highlight_type: string | null;
  public_url: string;
}
export interface InstitutionDetail extends InstitutionSummary {
  description_en: string | null;
  description_hi: string | null;
  address_en: string | null;
  address_hi: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

// ── Official communications ──────────────────────────────────────────────────
export interface CommunicationSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  communication_type: MasterRef;
  reference_number: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  highlight_type: string | null;
  public_url: string;
}
export interface CommunicationDetail extends CommunicationSummary {
  body_en: string | null;
  body_hi: string | null;
  document: DocumentRef | null;
}

// ── Tenders ──────────────────────────────────────────────────────────────────
export interface TenderSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  tender_type: MasterRef;
  tender_number: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  tender_status: string | null;
  gem_url: string | null;
  highlight_type: string | null;
  public_url: string;
}
export type TenderDetail = TenderSummary;

// ── Procurement updates ──────────────────────────────────────────────────────
export interface ProcurementSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  procurement_update_type: MasterRef;
  commodity: MasterRef | null;
  rate: number | null;
  unit: string | null;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  district: MasterRef | null;
  block: MasterRef | null;
  location_text: string | null;
  status: string | null;
  highlight_type: string | null;
  public_url: string;
}
export interface ProcurementDetail extends ProcurementSummary {
  description_en: string | null;
  description_hi: string | null;
  programme: ProgrammeRef | null;
  document: DocumentRef | null;
}

// ── Memberships ──────────────────────────────────────────────────────────────
export interface MembershipSummary {
  id: string;
  slug: string;
  institution: InstitutionRef | null;
  membership_level: string;
  membership_type: string;
  membership_number: string | null;
  district: MasterRef | null;
  district_union: InstitutionRef | null;
  reporting_period: MasterRef | null;
  status: string;
  join_date: string | null;
  primary_member_count: number;
  nominal_member_count: number;
  highlight_type: string | null;
  public_url: string;
}

// ── Galleries ────────────────────────────────────────────────────────────────
export interface GalleryImage {
  id: string;
  media: MediaRef;
  display_order: number;
  caption_en: string | null;
  caption_hi: string | null;
}

export interface GallerySummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  cover_media: MediaRef | null;
  image_count: number;
  display_order: number | null;
  public_url: string;
}

export interface GalleryDetail {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  cover_media: MediaRef | null;
  image_count: number;
  images: GalleryImage[];
  display_order: number | null;
  public_url: string;
}

// ── Videos ───────────────────────────────────────────────────────────────────
export interface Video {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string;
  display_order: number | null;
  public_url: string;
}

// ── FAQs ─────────────────────────────────────────────────────────────────────
export interface Faq {
  id: string;
  slug: string;
  question_en: string;
  question_hi: string | null;
  answer_en: string;
  answer_hi: string | null;
  faq_category: MasterRef | null;
  highlight_type: string | null;
}

// ── Digital services ─────────────────────────────────────────────────────────
export interface DigitalService {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  external_url: string;
  icon: MediaRef | null;
  highlight_type: string | null;
  opens_new_tab: boolean;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardMetric {
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  financial_year: FinancialYearRef | null;
  reporting_period: ReportingPeriodRef | null;
}
export interface DashboardReport {
  report_key: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  display_order: number | null;
  highlight_type: string | null;
  public_url: string;
  layout_config?: unknown;
  metrics: DashboardMetric[];
}
export interface DashboardResponse {
  reports: DashboardReport[];
}
export interface KpisResponse {
  kpis: DashboardReport[];
}

// ── Search ───────────────────────────────────────────────────────────────────
export const SEARCH_CONTENT_TYPES = [
  'event',
  'news',
  'programme',
  'document',
  'official_communication',
  'tender',
  'procurement_update',
  'page',
] as const;
export type SearchContentType = (typeof SEARCH_CONTENT_TYPES)[number];

export interface SearchResult {
  content_type: SearchContentType;
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary: string | null;
  publication_date: string | null;
  cover_media: MediaRef | null;
  public_url: string;
}

