/**
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
