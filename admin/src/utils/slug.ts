/**
 * Slug helpers. NOTE: slugs are server-generated and immutable after creation
 * (codex §11). This is only a client-side PREVIEW for create forms; the backend
 * remains authoritative. Never send a slug on update.
 */

import { REGEX } from '@/constants/app';

/** Best-effort preview slug from a title. ASCII-only; Devanagari → empty parts. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function isValidSlug(slug: string): boolean {
  return REGEX.slug.test(slug);
}
