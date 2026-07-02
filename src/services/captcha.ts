/**
 * CAPTCHA verification service (CMS requirements §4.12 / API spec §6).
 *
 * Provider is configured via CAPTCHA_PROVIDER env var:
 *   'none'      — no-op; all tokens pass (development/test mode)
 *   'recaptcha' — Google reCAPTCHA v2/v3 (verifies against the secret)
 *   'turnstile' — Cloudflare Turnstile
 *
 * A missing or invalid token fails with a 422 validation_error when a real provider is
 * configured. The verification call is fail-closed for CAPTCHA (unlike audit which is
 * fail-open) — a network error to the CAPTCHA provider blocks the submission.
 */
import { abuseConfig } from '@/config';
import { ValidationError } from '@/shared/errors';
import { logger } from '@/shared/logger';

const captchaLog = logger.child({ component: 'captcha' });

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface CaptchaVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

async function verifyWithProvider(url: string, token: string): Promise<void> {
  const body = new URLSearchParams({
    secret: abuseConfig.captchaSecret ?? '',
    response: token,
  });
  let data: CaptchaVerifyResponse;
  try {
    const res = await fetch(url, { method: 'POST', body });
    data = (await res.json()) as CaptchaVerifyResponse;
  } catch (err) {
    captchaLog.error({ err }, 'CAPTCHA provider unreachable');
    throw new ValidationError({ captcha_token: ['CAPTCHA verification failed. Please try again.'] });
  }
  if (!data.success) {
    captchaLog.warn({ codes: data['error-codes'] }, 'CAPTCHA challenge failed');
    throw new ValidationError({ captcha_token: ['CAPTCHA verification failed. Please try again.'] });
  }
}

/**
 * Verify the opaque CAPTCHA token supplied in the enquiry submission. When provider is 'none'
 * the function is a no-op and returns immediately (used in development and test environments).
 */
export async function verifyCaptcha(token: string | undefined): Promise<void> {
  const provider = abuseConfig.captchaProvider;
  if (provider === 'none') return;

  if (!token || token.trim() === '') {
    throw new ValidationError({ captcha_token: ['CAPTCHA token is required.'] });
  }

  if (provider === 'recaptcha') return verifyWithProvider(RECAPTCHA_VERIFY_URL, token);
  if (provider === 'turnstile') return verifyWithProvider(TURNSTILE_VERIFY_URL, token);
}
