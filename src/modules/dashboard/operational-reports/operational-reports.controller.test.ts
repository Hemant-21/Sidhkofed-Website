/**
 * Unit tests — Operational Reports export controller (`POST .../:key/export`). The service and
 * registry are mocked so this only verifies HTTP-layer wiring: correct headers, that the workbook
 * built from a mocked `generateForExport()` result contains Summary/Data/Definitions sheets, and
 * that the row-limit rejection (`PayloadTooLargeError`) reaches `next()` rather than being written
 * as a file.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { unzipSync, strFromU8 } from 'fflate';

const service = vi.hoisted(() => ({
  listCatalogue: vi.fn(),
  generate: vi.fn(),
  generateForExport: vi.fn(),
}));

vi.mock('./operational-reports.service', () => ({ operationalReportsService: service }));

import { operationalReportsController } from './operational-reports.controller';
import { PayloadTooLargeError } from '@/shared/errors';

function makeReq(params: Record<string, string>, body: unknown = {}): Request {
  return { params, body, id: 'req-1' } as unknown as Request;
}

function makeRes() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: vi.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { res: res as unknown as Response, headers };
}

function unzip(buf: Buffer): Record<string, string> {
  const map = unzipSync(new Uint8Array(buf));
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(map)) out[name] = strFromU8(bytes);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('operationalReportsController.exportReport', () => {
  it('streams an XLSX with correct headers and Summary/Data/Definitions sheets', async () => {
    service.generateForExport.mockResolvedValue({
      reportKey: 'event_activity_outcomes',
      resolvedPeriod: {
        mode: 'fixed_range',
        start: new Date('2025-04-01'),
        end: new Date('2025-06-30'),
        basisDescription: 'start date',
      },
      filters: {},
      summary: [
        {
          key: 'total_events',
          calculationVersion: 1,
          labelEn: 'Total events (in period)',
          labelHi: 'कुल गतिविधियाँ',
          unit: 'events',
          value: 10,
          completeness: { known: 10, missing: 0, undated: 0 },
          noteEn: 'Count of events whose start date falls within the resolved period.',
        },
      ],
      rows: { items: [{ id: 'e1', start_date: '2025-04-05' }], total: 1, page: 1, pageSize: 1 },
      calculatedAt: new Date('2025-07-01T00:00:00Z'),
    });

    const req = makeReq({ key: 'event_activity_outcomes' });
    const { res, headers } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    operationalReportsController.exportReport(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).not.toHaveBeenCalled();
    expect(headers['Content-Type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(headers['Content-Disposition']).toContain('event_activity_outcomes-2025-07-01.xlsx');

    const endMock = res.end as unknown as ReturnType<typeof vi.fn>;
    expect(endMock).toHaveBeenCalledTimes(1);
    const buffer = endMock.mock.calls[0][0] as Buffer;
    const files = unzip(buffer);
    expect(files['xl/workbook.xml']).toContain('name="Summary"');
    expect(files['xl/workbook.xml']).toContain('name="Data"');
    expect(files['xl/workbook.xml']).toContain('name="Definitions"');
    expect(files['xl/sharedStrings.xml']).toContain('Total events (in period)');
    expect(files['xl/sharedStrings.xml']).toContain('e1');
  });

  it('passes a PayloadTooLargeError to next() instead of writing a file when over the row limit', async () => {
    service.generateForExport.mockRejectedValue(
      new PayloadTooLargeError('This report has too many rows to export.'),
    );

    const req = makeReq({ key: 'event_activity_outcomes' });
    const { res } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    operationalReportsController.exportReport(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(
      PayloadTooLargeError,
    );
    expect(res.end).not.toHaveBeenCalled();
  });
});
