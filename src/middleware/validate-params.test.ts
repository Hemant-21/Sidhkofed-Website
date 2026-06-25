/** Unit tests — UUID route-param validation (Issue 9): 422 for malformed ids, not 500. */
import { describe, it, expect, vi } from 'vitest';
import { uuidParam, requireUuidParams } from './validate-params';
import { ValidationError } from '@/shared/errors';
import type { Request, Response } from 'express';

const VALID = '11111111-1111-4111-8111-111111111111';

describe('uuidParam', () => {
  it('passes a valid UUID', () => {
    const next = vi.fn();
    uuidParam({} as Request, {} as Response, next, VALID, 'id');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a malformed UUID with a ValidationError', () => {
    const next = vi.fn();
    uuidParam({} as Request, {} as Response, next, 'not-a-uuid', 'id');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });
});

describe('requireUuidParams', () => {
  it('collects all invalid params into one 422', () => {
    const next = vi.fn();
    const mw = requireUuidParams('id', 'imageId');
    mw({ params: { id: 'bad', imageId: VALID } } as unknown as Request, {} as Response, next);
    const err = next.mock.calls[0][0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.fields).toHaveProperty('id');
    expect(err.fields).not.toHaveProperty('imageId');
  });
});
