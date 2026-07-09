'use client';

/**
 * Enquiries data layer. List/detail/annotate(PATCH)/archive all match the standard admin "P"
 * resource shape (enquiries.routes.ts), so the shared CRUD hooks (useCrudList/useCrudDetail/
 * useCrudUpdate/useArchive) drive them directly against the `enquiries` resource in the page —
 * no bespoke fetch logic for those. Export is the one non-standard action (a synchronous XLSX
 * stream, not JSON — enquiries.controller.ts exportXlsx), so it gets its own helper built on the
 * shared `getBlob` + `downloadBlob` primitives (the same primitives documents/media use for
 * file downloads).
 */

import { adminResource } from '@/constants/api-endpoints';
import { getBlob } from '@/lib/api/http';
import { downloadBlob } from '@/utils/browser';
import { normalizeListQuery, withQuery } from '@/utils/query-string';
import type { ListQuery } from '@/types/api';
import { ENQUIRIES_RESOURCE } from './types';

export { ENQUIRIES_RESOURCE };
export { ENQUIRY_ROLES } from './permissions';

/**
 * GET /admin/enquiries/export?<filters> — streams the XLSX attachment and triggers a browser
 * download. Accepts the same filter query as the list (pagination keys are harmlessly ignored by
 * the backend export handler, which reads only the allow-listed filter fields).
 */
export async function exportEnquiries(query?: ListQuery): Promise<void> {
  const url = `${adminResource(ENQUIRIES_RESOURCE).list}/export`;
  const blob = await getBlob(withQuery(url, normalizeListQuery(query)));
  downloadBlob(blob, `enquiries-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
