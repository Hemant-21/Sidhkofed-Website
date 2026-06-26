/**
 * Pure form ↔ API mapping for the document form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `DocumentWriteInput` the backend accepts: empties
 * become null, the highlight window is only sent with a highlight, dates widen to the transport
 * shapes (publication_date is a calendar date; publish/highlight windows are ISO timestamps).
 * Server-managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType, Language } from '@/types/common';
import type { DocumentDetail, DocumentWriteInput } from './types';

export interface DocumentFormValues {
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  document_type_id: string;
  file_asset_id: string;
  language: Language;
  publication_date: string;
  is_public: boolean;
  show_in_knowledge_centre: boolean;
  knowledge_category_id: string;
  financial_year_id: string;
  commodity_ids: string[];
  district_ids: string[];
  tag_ids: string[];
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string;
  highlight_start_at: string;
  highlight_end_at: string;
  display_order: string;
  publish_start_at: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

/** Default (empty) form values for the create route. */
export function emptyDocumentForm(): DocumentFormValues {
  return {
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    document_type_id: '',
    file_asset_id: '',
    language: 'en',
    publication_date: '',
    is_public: true,
    show_in_knowledge_centre: false,
    knowledge_category_id: '',
    financial_year_id: '',
    commodity_ids: [],
    district_ids: [],
    tag_ids: [],
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

/** Hydrate the form from an existing document (edit route). */
export function documentToForm(d: DocumentDetail): DocumentFormValues {
  return {
    title_en: d.title_en,
    title_hi: d.title_hi ?? '',
    description_en: d.description_en ?? '',
    description_hi: d.description_hi ?? '',
    document_type_id: d.document_type.id,
    file_asset_id: d.file.id,
    language: (d.language === 'hi' ? 'hi' : 'en') as Language,
    publication_date: d.publication_date ? d.publication_date.slice(0, 10) : '',
    is_public: d.is_public,
    show_in_knowledge_centre: d.show_in_knowledge_centre,
    knowledge_category_id: d.knowledge_category?.id ?? '',
    financial_year_id: d.financial_year?.id ?? '',
    commodity_ids: d.commodities.map((c) => c.id),
    district_ids: d.districts.map((x) => x.id),
    tag_ids: d.tags.map((t) => t.id),
    public_visibility: d.public_visibility,
    show_on_homepage: d.show_on_homepage,
    highlight_type: d.highlight_type ?? '',
    highlight_start_at: d.highlight_start_at ? d.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: d.highlight_end_at ? d.highlight_end_at.slice(0, 10) : '',
    display_order: d.display_order != null ? String(d.display_order) : '',
    publish_start_at: d.publish_start_at ? d.publish_start_at.slice(0, 10) : '',
  };
}

/** Convert form values → the API write payload. Used for both create and PATCH. */
export function buildDocumentPayload(v: DocumentFormValues): DocumentWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  const inKnowledgeCentre = v.show_in_knowledge_centre;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    document_type_id: v.document_type_id,
    file_asset_id: v.file_asset_id,
    language: v.language,
    publication_date: dateToIso(v.publication_date),
    is_public: v.is_public,
    show_in_knowledge_centre: inKnowledgeCentre,
    // Category is only meaningful (and required) when the doc is in the Knowledge Centre.
    knowledge_category_id: inKnowledgeCentre ? blank(v.knowledge_category_id) : null,
    financial_year_id: blank(v.financial_year_id),
    commodity_ids: v.commodity_ids,
    district_ids: v.district_ids,
    tag_ids: v.tag_ids,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
