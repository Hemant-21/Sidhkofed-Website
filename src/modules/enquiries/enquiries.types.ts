/**
 * Enquiries module shared types — filter and ordering contract used by the controller, service,
 * and repository (API spec §6 Enquiries / CMS requirements §4.12).
 *
 * Enquiries are NOT publishable content (no publication_state, no highlight, no homepage).
 * They are public submissions, managed internally; admin list filters span spam_state and date.
 */
import type { SpamState } from '@prisma/client';

export const ENQUIRY_ENTITY = 'enquiry';

/** Valid spam-state values aligned with the Prisma enum. */
export const SPAM_STATES = ['clean', 'suspected', 'spam'] as const;
export type SpamStateValue = SpamState;

/** Admin list filters. All optional; repository only reads known keys. */
export interface EnquiryFilters {
  enquiryType?: string;    // id or slug
  spamState?: SpamStateValue;
  archived?: boolean;      // true = only archived; false = only non-archived; undefined = all
  dateFrom?: Date;
  dateTo?: Date;
  commodityId?: string;
  programmeId?: string;
  search?: string;         // name, email, subject, organization
}

/** Allowed ordering fields for the admin list (API spec §6 Enquiries). */
export const ENQUIRY_ORDERING_FIELDS = ['submitted_at', 'created_at'] as const;
export type EnquiryOrderingField = (typeof ENQUIRY_ORDERING_FIELDS)[number];
