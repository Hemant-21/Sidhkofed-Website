/**
<<<<<<< HEAD
 * Masters module types. The generic master manager covers the STANDARD name-based masters
 * (identity `name_en`, shared create/update shape: `name_en`, `name_hi`, `display_order`, active
 * flag). Specialised masters with extra required fields (commodities, blocks, financial-years,
 * reporting-periods) keep their own bespoke handling and are intentionally not listed here.
 */

export interface MasterItem {
  id: string;
  slug: string | null;
  name_en: string;
  name_hi: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

/** Standard master keys (kebab-case) the manager exposes, with display labels. */
export const STANDARD_MASTERS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'event-types', label: 'Event types' },
  { key: 'training-types', label: 'Training types' },
  { key: 'institution-types', label: 'Institution types' },
  { key: 'document-types', label: 'Document types' },
  { key: 'knowledge-categories', label: 'Knowledge categories' },
  { key: 'communication-types', label: 'Communication types' },
  { key: 'tender-types', label: 'Tender types' },
  { key: 'procurement-update-types', label: 'Procurement update types' },
  { key: 'faq-categories', label: 'FAQ categories' },
  { key: 'enquiry-types', label: 'Enquiry types' },
  { key: 'tags', label: 'Tags' },
  { key: 'districts', label: 'Districts' },
];

export interface MasterWriteInput {
  name_en: string;
  name_hi?: string | null;
  display_order?: number | null;
}
=======
 * Master data types and configuration. All masters share a common shape via the
 * generic `/admin/masters/{key}` API (spec §4). Some types have extra fields and
 * are flagged accordingly so the UI can adjust.
 */

/** A single master record as returned by the list/detail endpoints. */
export interface MasterRecord {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Extra fields present on some master types (commodities, blocks, etc.). */
  [key: string]: unknown;
}

/** Payload for creating/updating a standard master. */
export interface MasterPayload {
  name_en: string;
  name_hi?: string | null;
  display_order?: number | null;
  is_active?: boolean;
}

/** Whether a master type allows full CRUD or is seeded/read-only. */
export type MasterEditMode = 'full' | 'seeded';

/** Configuration for each known master type. */
export interface MasterTypeConfig {
  /** kebab-case API key: `/admin/masters/{key}` */
  key: string;
  /** Human label for display. */
  label: string;
  /** One-liner describing what this master controls. */
  description: string;
  /** Whether the Super Admin can create/edit/deactivate records. */
  editMode: MasterEditMode;
}

/** All 18 master types defined in the CMS requirements (codex §6). */
export const MASTER_TYPES: MasterTypeConfig[] = [
  {
    key: 'event-types',
    label: 'Event Types',
    description: 'Categories for all institutional activities (Training, Workshop, MoU Signing, etc.).',
    editMode: 'full',
  },
  {
    key: 'training-types',
    label: 'Training Types',
    description: 'Sub-classifications for training events.',
    editMode: 'full',
  },
  {
    key: 'commodities',
    label: 'Commodities',
    description: 'MFP and agricultural commodities (Lac, Honey, Ragi, etc.).',
    editMode: 'full',
  },
  {
    key: 'institution-types',
    label: 'Institution Types',
    description: 'Categories for partner and institutional organisations.',
    editMode: 'full',
  },
  {
    key: 'document-types',
    label: 'Document Types',
    description: 'Document classification (Notice, Circular, MoU, Report, etc.).',
    editMode: 'full',
  },
  {
    key: 'knowledge-categories',
    label: 'Knowledge Centre Categories',
    description: 'Groupings shown on the public Knowledge Centre page.',
    editMode: 'full',
  },
  {
    key: 'communication-types',
    label: 'Communication Types',
    description: 'Types of official communications (Notice, Circular, Advisory, etc.).',
    editMode: 'full',
  },
  {
    key: 'tender-types',
    label: 'Tender Types',
    description: 'Classification of tender records.',
    editMode: 'full',
  },
  {
    key: 'procurement-update-types',
    label: 'Procurement Update Types',
    description: 'Sub-types for procurement updates (Rate, Announcement, Schedule, etc.).',
    editMode: 'full',
  },
  {
    key: 'enquiry-types',
    label: 'Enquiry Types',
    description: 'Public enquiry categories used on the contact form.',
    editMode: 'full',
  },
  {
    key: 'faq-categories',
    label: 'FAQ Categories',
    description: 'Groupings for Frequently Asked Questions.',
    editMode: 'full',
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Internal document classification tags.',
    editMode: 'full',
  },
  {
    key: 'districts',
    label: 'Districts',
    description: 'Jharkhand districts. Seeded at setup; contact the administrator to add records.',
    editMode: 'seeded',
  },
  {
    key: 'blocks',
    label: 'Blocks',
    description: 'Blocks within districts. Seeded at setup; contact the administrator to add records.',
    editMode: 'seeded',
  },
  {
    key: 'financial-years',
    label: 'Financial Years',
    description: 'Financial year periods used for reporting and document classification.',
    editMode: 'full',
  },
  {
    key: 'reporting-periods',
    label: 'Reporting Periods',
    description: 'Month, financial-year, calendar-year, and cumulative periods for dashboard data.',
    editMode: 'full',
  },
];

/** Ordered group definitions for the masters sidebar. */
export const MASTER_GROUPS: Array<{ label: string; keys: string[] }> = [
  {
    label: 'Content Classification',
    keys: ['event-types', 'training-types', 'commodities', 'institution-types'],
  },
  {
    label: 'Documents & Communications',
    keys: ['document-types', 'knowledge-categories', 'communication-types'],
  },
  {
    label: 'Governance',
    keys: ['tender-types', 'procurement-update-types', 'enquiry-types', 'faq-categories', 'tags'],
  },
  {
    label: 'Geography',
    keys: ['districts', 'blocks'],
  },
  {
    label: 'Reporting',
    keys: ['financial-years', 'reporting-periods'],
  },
];

/** Lookup a master type config by key. */
export function findMasterType(key: string): MasterTypeConfig | undefined {
  return MASTER_TYPES.find((m) => m.key === key);
}

/** Default master type key (first non-seeded type). */
export const DEFAULT_MASTER_KEY = 'event-types';

/** Filter keys accepted by the master list endpoint. */
export const MASTER_FILTER_KEYS = ['search'] as const;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
