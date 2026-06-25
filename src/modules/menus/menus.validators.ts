/**
 * Menu item request validators (shape/field only; relationship/cycle rules live in the service).
 * Accepts ONLY model-backed fields; rejects unknown keys.
 *
 * A menu item must carry EITHER `page_id` (internal page link) OR `url` (internal path / external
 * URL) — enforced here as a shape rule on create, and re-checked against the merged record in the
 * service on update. The url scheme is restricted to an internal path (`/...`) or http(s) to reject
 * unsafe schemes such as `javascript:` (API spec §6 "validate ... URL scheme").
 */
import { z } from 'zod';
import { parseSchema, uuid } from '@/shared/validation';
import { MENU_LOCATIONS } from './menus.types';

/**
 * Internal path (`/about`, `/`) or an absolute http(s) URL. Rejects every other scheme — including
 * scheme-relative URLs like `//evil.example` (which start with `/` but are protocol-relative links to
 * another host), and `javascript:` / `data:` / `ftp:` (Phase 10 remediation Issue 2).
 */
const menuUrl = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (s) => (s.startsWith('/') && !s.startsWith('//')) || /^https?:\/\//i.test(s),
    'Must be an internal path (/...) or an http(s) URL.',
  );

const baseShape = {
  label_en: z.string().trim().min(1, 'This field is required.').max(120),
  label_hi: z.string().trim().max(120).nullable().optional(),
  location: z.enum(MENU_LOCATIONS),
  url: menuUrl.nullable().optional(),
  page_id: uuid.nullable().optional(),
  parent_id: uuid.nullable().optional(),
  opens_new_tab: z.boolean().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
};

/** At least one of url / page_id must resolve a destination. */
function hasDestination(url?: string | null, pageId?: string | null): boolean {
  return Boolean(url) || Boolean(pageId);
}

export const menuItemCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    if (!hasDestination(data.url, data.page_id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Provide either a url or a page_id.' });
    }
  });
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;
export const validateMenuItemCreate = (p: unknown): MenuItemCreateInput => parseSchema(menuItemCreateSchema, p);

// PATCH is partial; the "at least one destination" invariant is re-checked in the service against the
// merged record (the client may clear one side while the other already exists).
export const menuItemUpdateSchema = z.object(baseShape).partial().strict();
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;
export const validateMenuItemUpdate = (p: unknown): MenuItemUpdateInput => parseSchema(menuItemUpdateSchema, p);

// ── Reorder ─────────────────────────────────────────────────────────────────────
export const menuReorderSchema = z
  .object({
    items: z
      .array(z.object({ id: uuid, display_order: z.number().int() }).strict())
      .min(1, 'Provide at least one item to reorder.')
      .max(500),
  })
  .strict();
export type MenuReorderInput = z.infer<typeof menuReorderSchema>;
export const validateMenuReorder = (p: unknown): MenuReorderInput => parseSchema(menuReorderSchema, p);
