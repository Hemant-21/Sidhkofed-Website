/**
 * Unit tests — public Operational Reports controller. The service is mocked so this only verifies
 * HTTP-layer wiring: envelope shape and that a rejected promise reaches `next()`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const service = vi.hoisted(() => ({
  getAllPublicReports: vi.fn(),
  getPublicReport: vi.fn(),
}));

vi.mock('./operational-reports.public.service', () => ({ operationalReportsPublicService: service }));

import { operationalReportsPublicController } from './operational-reports.public.controller';
import { NotFoundError } from '@/shared/errors';

function makeReq(params: Record<string, string> = {}): Request {
  return { params, id: 'req-1' } as unknown as Request;
}

function makeRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('operationalReportsPublicController.listAll', () => {
  it('returns 200 with the envelope-wrapped reports array', async () => {
    service.getAllPublicReports.mockResolvedValue({ reports: [{ report_key: 'event_activity_outcomes' }] });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    operationalReportsPublicController.listAll(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
    const body = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.data.reports).toEqual([{ report_key: 'event_activity_outcomes' }]);
  });
});

describe('operationalReportsPublicController.getOne', () => {
  it('passes the :key param through to the service', async () => {
    service.getPublicReport.mockResolvedValue({ report_key: 'training_attendance' });
    const req = makeReq({ key: 'training_attendance' });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    operationalReportsPublicController.getOne(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(service.getPublicReport).toHaveBeenCalledWith('training_attendance');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forwards a NotFoundError from the service to next()', async () => {
    service.getPublicReport.mockRejectedValue(new NotFoundError('Unknown operational report "bogus".'));
    const req = makeReq({ key: 'bogus' });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    operationalReportsPublicController.getOne(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });
});
