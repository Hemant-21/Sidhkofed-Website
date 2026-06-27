/**
 * Enquiry admin controller — `/api/v1/admin/enquiries/*` (API spec §6).
 * HTTP-only: parse → validate → call service → return through the shared envelope.
 *
 * RBAC: Publisher + Super Admin (no Content Editor access by default — API spec §8).
 * PATCH accepts only `internal_notes` and `spam_state`; archive is idempotent.
 * Export: synchronous XLSX stream for datasets up to the service cap (10 000 rows).
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { enquiryService } from './enquiries.service';
import { validateEnquiryAdminPatch } from './enquiries.validators';
import { parseEnquiryFilters, parseEnquiryOrdering } from './enquiries.query';
import { writeXlsx } from '@/utils/xlsx-writer';
import type { EnquiryExportRow } from './enquiries.dto';

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

/** Column headers for the XLSX export — must match EnquiryExportRow keys in display order. */
const EXPORT_HEADERS: (keyof EnquiryExportRow)[] = [
  'id',
  'submitted_at',
  'enquiry_type',
  'name',
  'email',
  'mobile',
  'organization',
  'subject',
  'message',
  'commodity',
  'programme_scheme',
  'spam_state',
  'archived_at',
];

export const list = wrap(async (req, res) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseEnquiryFilters(req);
  const ordering = parseEnquiryOrdering(req);
  const { items, total } = await enquiryService.list(filters, ordering, page.skip, page.take);
  res.status(200).json(paginated(items, buildPagination(total, page), String(req.id)));
});

export const detail = wrap(async (req, res) => {
  const dto = await enquiryService.getById(req.params.id as string);
  res.status(200).json(success(dto, String(req.id)));
});

export const patch = wrap(async (req, res) => {
  const input = validateEnquiryAdminPatch(req.body);
  const dto = await enquiryService.patch(req.params.id as string, input, auditContext(req));
  res.status(200).json(success(dto, String(req.id), 'Enquiry updated.'));
});

export const archive = wrap(async (req, res) => {
  const dto = await enquiryService.archive(req.params.id as string, auditContext(req));
  res.status(200).json(success(dto, String(req.id), 'Enquiry archived.'));
});

/**
 * GET /admin/enquiries/export?format=xlsx
 * Streams a synchronous XLSX attachment. For the bounded export cap (10 000 rows), this is
 * fast enough for an inline response. The API spec allows a 202 async path for large result
 * sets; a background job queue is not yet wired up for enquiries, so we always stream inline.
 */
export const exportXlsx = wrap(async (req, res) => {
  const filters = parseEnquiryFilters(req);
  const rows = await enquiryService.exportRows(filters);
  const grid: string[][] = [
    EXPORT_HEADERS.map(String),
    ...rows.map((r) => EXPORT_HEADERS.map((k) => String(r[k] ?? ''))),
  ];
  const buffer = writeXlsx(grid);
  const filename = `enquiries-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(buffer.byteLength));
  res.status(200).end(buffer);
});

export const enquiryController = { list, detail, patch, archive, exportXlsx };
