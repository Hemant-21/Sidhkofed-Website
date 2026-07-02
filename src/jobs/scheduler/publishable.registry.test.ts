/**
 * Guards the publishable registry: every mixin-bearing module is covered exactly once, each entry
 * wires a real publish function, and no model is duplicated. This catches a forgotten module when a
 * new publishable resource is added.
 */
import { describe, it, expect } from 'vitest';
import { PUBLISHABLE_RESOURCES } from './publishable.registry';

describe('PUBLISHABLE_RESOURCES', () => {
  it('covers all 16 publishing-mixin models', () => {
    expect(PUBLISHABLE_RESOURCES).toHaveLength(16);
  });

  it('has unique keys and unique Prisma model names', () => {
    const keys = PUBLISHABLE_RESOURCES.map((r) => r.key);
    const models = PUBLISHABLE_RESOURCES.map((r) => r.model);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(models).size).toBe(models.length);
  });

  it('includes every Phase 14 scheduled-publishing module', () => {
    const models = new Set(PUBLISHABLE_RESOURCES.map((r) => r.model));
    for (const m of [
      'event',
      'eventNews',
      'programmeScheme',
      'toolkit',
      'institution',
      'officialCommunication',
      'tender',
      'procurementUpdate',
      'page',
      'faq',
      'digitalService',
      'institutionalMembership',
      'dashboardReport',
      'document',
      'gallery',
      'video',
    ]) {
      expect(models.has(m as never)).toBe(true);
    }
  });

  it('binds a callable publish function to each resource', () => {
    for (const r of PUBLISHABLE_RESOURCES) {
      expect(typeof r.publish).toBe('function');
    }
  });
});
