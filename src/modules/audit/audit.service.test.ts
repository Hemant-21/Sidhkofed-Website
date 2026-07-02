/** Unit tests — centralized audit service: event→enum mapping, metadata, resilience. */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/db/prisma', () => ({ prisma: { auditLog: { create } } }));

import { auditService } from './audit.service';

beforeEach(() => create.mockReset().mockResolvedValue({}));

describe('audit.service', () => {
  it('maps MEDIA_UPLOAD onto the `create` DB action and keeps the event name', async () => {
    await auditService.log('MEDIA_UPLOAD', { userId: 'u1', ipHash: 'h', userAgent: 'UA' }, { module: 'media', recordId: 'm1' });
    const arg = create.mock.calls[0][0].data;
    expect(arg.action).toBe('create');
    expect(arg.module).toBe('media');
    expect(arg.metadata.event).toBe('MEDIA_UPLOAD');
    expect(arg.metadata.user_agent).toBe('UA');
    expect(arg.ipHash).toBe('h');
  });

  it('records old/new values for updates', async () => {
    await auditService.update({ userId: 'u1' }, 'media', 'm1', { title: 'a' }, { title: 'b' });
    const arg = create.mock.calls[0][0].data;
    expect(arg.action).toBe('update');
    expect(arg.metadata.old_values).toEqual({ title: 'a' });
    expect(arg.metadata.new_values).toEqual({ title: 'b' });
  });

  it('maps lifecycle events', async () => {
    await auditService.publish({ userId: 'u1' }, 'galleries', 'g1', { previousState: 'draft', newState: 'published' });
    expect(create.mock.calls[0][0].data.action).toBe('publish');
  });

  it('keeps the legacy record() API working (auth module)', async () => {
    await auditService.record({ userId: 'u1', action: 'login', module: 'auth', recordId: 'u1', summary: 'LOGIN_SUCCESS' });
    expect(create.mock.calls[0][0].data.action).toBe('login');
    expect(create.mock.calls[0][0].data.changeSummary).toBe('LOGIN_SUCCESS');
  });

  it('never throws when every insert attempt fails (auditing must not break the operation)', async () => {
    // AUDIT_MAX_ATTEMPTS rejections — the write ultimately fails but is reported, not thrown.
    create
      .mockRejectedValueOnce(new Error('db down'))
      .mockRejectedValueOnce(new Error('db down'))
      .mockRejectedValueOnce(new Error('db down'));
    await expect(auditService.log('CREATE', { userId: 'u1' }, { module: 'media', recordId: 'm1' })).resolves.toBeUndefined();
  });

  // Durability (Issue 2): bounded retry rides out a transient failure.
  it('retries a transient insert failure and succeeds without losing the audit row', async () => {
    create.mockRejectedValueOnce(new Error('connection reset')).mockResolvedValueOnce({});
    await auditService.log('CREATE', { userId: 'u1' }, { module: 'media', recordId: 'm1' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].data.module).toBe('media');
  });

  it('gives up after the bounded number of attempts but stays fail-open', async () => {
    create
      .mockRejectedValueOnce(new Error('db down'))
      .mockRejectedValueOnce(new Error('db down'))
      .mockRejectedValueOnce(new Error('db down'));
    await expect(
      auditService.log('CREATE', { userId: 'u1' }, { module: 'media', recordId: 'm1' }),
    ).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledTimes(3); // AUDIT_MAX_ATTEMPTS
  });
});
