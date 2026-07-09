/**
 * Unit tests — public settings controller (`GET /public/settings/:group`).
 * Only the curated allow-list of groups is exposed; unauthenticated (no req.user needed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const { getGroup } = vi.hoisted(() => ({ getGroup: vi.fn() }));
vi.mock('./settings.service', () => ({ settingsService: { getGroup } }));

import { getPublicGroup } from './settings.public.controller';

function mockRes(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

beforeEach(() => vi.clearAllMocks());

describe('settingsPublicController.getPublicGroup', () => {
  it('returns 200 with the resolved values for the allow-listed "contact" group', async () => {
    const values = {
      'contact.office_name': 'Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
      'contact.address': '1st Floor, Sameti Bhawan, Behind Krishi Bhawan, Kanke Road, Ranchi, Jharkhand – 834008',
      'contact.phone': '0651-2913142',
      'contact.email': 'sidhokanhofed@gmail.com',
      'contact.office_hours': 'Monday – Saturday, 10:00 AM – 5:00 PM',
      'contact.map_url': 'https://maps.app.goo.gl/hUMpwZStpAnDRwZs8',
    };
    getGroup.mockResolvedValue(values);
    const req = { params: { group: 'contact' }, id: 'req-1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await new Promise<void>((resolve) => {
      (res.json as ReturnType<typeof vi.fn>).mockImplementation(() => resolve());
      getPublicGroup(req, res, next);
    });

    expect(getGroup).toHaveBeenCalledWith('contact');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: values }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an unknown group with a not_found error (never calls the service)', () => {
    const req = { params: { group: 'site' }, id: 'req-2' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    getPublicGroup(req, res, next);

    expect(getGroup).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'not_found' }));
  });
});
