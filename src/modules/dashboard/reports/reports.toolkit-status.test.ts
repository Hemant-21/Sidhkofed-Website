import { describe, expect, it } from 'vitest';
import { computeToolkitItemStatus } from './reports.toolkit-status';

describe('computeToolkitItemStatus', () => {
  it('returns not_recorded when there is no evidence at all', () => {
    expect(computeToolkitItemStatus({ evidenceCount: 0, distributedCount: 0 })).toBe('not_recorded');
  });

  it('returns distributed when every recorded summary is a confirmed distribution', () => {
    expect(computeToolkitItemStatus({ evidenceCount: 3, distributedCount: 3 })).toBe('distributed');
  });

  it('returns partially_distributed when some but not all summaries are confirmed', () => {
    expect(computeToolkitItemStatus({ evidenceCount: 3, distributedCount: 1 })).toBe('partially_distributed');
  });

  it('returns not_distributed when summaries exist but none are confirmed distributions', () => {
    expect(computeToolkitItemStatus({ evidenceCount: 2, distributedCount: 0 })).toBe('not_distributed');
  });

  it('never confuses zero-with-evidence (not_distributed) with zero-evidence (not_recorded)', () => {
    const noEvidence = computeToolkitItemStatus({ evidenceCount: 0, distributedCount: 0 });
    const recordedZero = computeToolkitItemStatus({ evidenceCount: 1, distributedCount: 0 });
    expect(noEvidence).not.toBe(recordedZero);
    expect(noEvidence).toBe('not_recorded');
    expect(recordedZero).toBe('not_distributed');
  });

  it('treats distributedCount >= evidenceCount defensively as fully distributed (no over-count crash)', () => {
    expect(computeToolkitItemStatus({ evidenceCount: 2, distributedCount: 2 })).toBe('distributed');
  });
});
