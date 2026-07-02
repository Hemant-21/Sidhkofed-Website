/**
 * Unit tests — captcha service.
 * Verifies the three CAPTCHA_PROVIDER modes: 'none' (no-op), 'recaptcha', 'turnstile'.
 * External HTTP calls are intercepted; abuseConfig is mocked to avoid env dependency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { cfg } = vi.hoisted(() => ({ cfg: { captchaProvider: 'none' as string, captchaSecret: '' } }));

vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    abuseConfig: cfg,
  };
});

import { verifyCaptcha } from './captcha';
import { ValidationError } from '@/shared/errors';

beforeEach(() => {
  vi.clearAllMocks();
  cfg.captchaProvider = 'none';
  cfg.captchaSecret = '';
});

describe('verifyCaptcha — provider: none', () => {
  it('is a no-op when provider is "none"', async () => {
    cfg.captchaProvider = 'none';
    await expect(verifyCaptcha(undefined)).resolves.toBeUndefined();
  });

  it('is a no-op even when a token is supplied', async () => {
    cfg.captchaProvider = 'none';
    await expect(verifyCaptcha('any-token')).resolves.toBeUndefined();
  });
});

describe('verifyCaptcha — provider: recaptcha / turnstile', () => {
  it('throws ValidationError when token is missing', async () => {
    cfg.captchaProvider = 'recaptcha';
    await expect(verifyCaptcha(undefined)).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when token is empty string', async () => {
    cfg.captchaProvider = 'recaptcha';
    await expect(verifyCaptcha('')).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when token is whitespace-only', async () => {
    cfg.captchaProvider = 'turnstile';
    await expect(verifyCaptcha('   ')).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when provider response indicates failure', async () => {
    cfg.captchaProvider = 'recaptcha';
    cfg.captchaSecret = 'fake-secret';
    const fakeFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    vi.stubGlobal('fetch', fakeFetch);
    await expect(verifyCaptcha('bad-token')).rejects.toBeInstanceOf(ValidationError);
    vi.unstubAllGlobals();
  });

  it('resolves when provider response indicates success', async () => {
    cfg.captchaProvider = 'recaptcha';
    cfg.captchaSecret = 'real-secret';
    const fakeFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal('fetch', fakeFetch);
    await expect(verifyCaptcha('good-token')).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('throws ValidationError when fetch throws (provider unreachable)', async () => {
    cfg.captchaProvider = 'turnstile';
    cfg.captchaSecret = 'secret';
    const fakeFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fakeFetch);
    await expect(verifyCaptcha('token')).rejects.toBeInstanceOf(ValidationError);
    vi.unstubAllGlobals();
  });
});
