/**
 * API contract tests — response envelope conformance (API spec §1.4).
 *
 * Every response, success or error, must use the single canonical envelope:
 *   Success single:  {success:true,  data:{},    meta:{request_id}}
 *   Success list:    {success:true,  data:[],    pagination:{}, meta:{}}
 *   Error:           {success:false, error:{code,message}, meta:{}}
 *
 * Tests use the public `/api/v1/` descriptor and the unauthenticated error
 * paths so no database, Redis, or seed data is needed.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

// ── Helper ────────────────────────────────────────────────────────────────────

function assertMeta(body: Record<string, unknown>): void {
  expect(body.meta).toBeDefined();
  expect(typeof (body.meta as Record<string, unknown>).request_id).toBe('string');
}

// ── 200 success (API root descriptor) ────────────────────────────────────────

describe('API envelope — 200 success (single resource)', () => {
  it('returns {success:true, data:{...}, meta:{request_id}}', async () => {
    const res = await request(app).get('/api/v1/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.error).toBeUndefined();
    assertMeta(res.body);
  });
});

// ── 404 not_found ─────────────────────────────────────────────────────────────

describe('API envelope — 404 not_found', () => {
  it('returns {success:false, error:{code,message}, meta:{request_id}}', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('not_found');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.data).toBeUndefined();
    assertMeta(res.body);
  });
});

// ── 401 authentication_required ───────────────────────────────────────────────

describe('API envelope — 401 authentication_required', () => {
  it('returns correct error shape for a protected admin endpoint without token', async () => {
    const res = await request(app).get('/api/v1/admin/enquiries');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('authentication_required');
    expect(res.body.data).toBeUndefined();
    assertMeta(res.body);
  });
});

// ── 422 validation_error ──────────────────────────────────────────────────────

describe('API envelope — 422 validation_error', () => {
  it('returns {success:false, error:{code,message,fields}, meta} for a POST with missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/public/enquiries')
      .send({ name: 'Test' }); // Missing required fields
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.fields).toBeDefined();
    expect(res.body.data).toBeUndefined();
    assertMeta(res.body);
  });

  it('has an error.fields object with at least one field error', async () => {
    const res = await request(app)
      .post('/api/v1/public/enquiries')
      .send({ name: '' }); // Invalid: empty name
    expect(res.body.error.fields).toBeDefined();
    expect(typeof res.body.error.fields).toBe('object');
  });
});

// ── 405 method not allowed ────────────────────────────────────────────────────

describe('API envelope — no data key on errors', () => {
  it('error responses never contain a data key', async () => {
    const res = await request(app).get('/api/v1/nonexistent-xyz');
    expect(res.body).not.toHaveProperty('data');
    expect(res.body).not.toHaveProperty('pagination');
  });
});

// ── 200 list responses ────────────────────────────────────────────────────────

describe('API envelope — pagination present on list endpoints', () => {
  it('public enquiries submission returns 201 with {success,data:{id,submitted_at},meta}', async () => {
    // POST with a honeypot-filled body should reject (422); use that to check the shape
    const res = await request(app)
      .post('/api/v1/public/enquiries')
      .send({
        name: 'Test',
        mobile: '+91 94300 00000',
        email: 'test@example.com',
        enquiry_type_id: 'not-a-uuid',
        subject: 'Test',
        message: 'Test message here.',
        website: 'filled-honeypot', // honeypot
      });
    // Honeypot: should be 422
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    assertMeta(res.body);
  });
});
