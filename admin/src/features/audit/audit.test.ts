import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL } from './types';
import type { AuditAction } from './types';

describe('AUDIT_ACTIONS', () => {
  it('contains the expected set of action strings', () => {
    expect(AUDIT_ACTIONS).toContain('create');
    expect(AUDIT_ACTIONS).toContain('publish');
    expect(AUDIT_ACTIONS).toContain('archive');
    expect(AUDIT_ACTIONS).toContain('restore');
    expect(AUDIT_ACTIONS).toContain('login');
    expect(AUDIT_ACTIONS).toContain('media_replace');
    expect(AUDIT_ACTIONS).toContain('config_change');
    expect(AUDIT_ACTIONS).toContain('master_change');
  });
});

describe('AUDIT_ACTION_LABEL', () => {
  it('has a label for every action in AUDIT_ACTIONS', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(AUDIT_ACTION_LABEL[action as AuditAction]).toBeTruthy();
    }
  });

  it('returns human-friendly strings', () => {
    expect(AUDIT_ACTION_LABEL.create).toBe('Created');
    expect(AUDIT_ACTION_LABEL.publish).toBe('Published');
    expect(AUDIT_ACTION_LABEL.login).toBe('Signed in');
    expect(AUDIT_ACTION_LABEL.media_replace).toBe('File replaced');
    expect(AUDIT_ACTION_LABEL.config_change).toBe('Settings changed');
  });
});
