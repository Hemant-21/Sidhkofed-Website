/**
 * Enquiry public controller — `POST /api/v1/public/enquiries` (API spec §6).
 *
 * The controller:
 *  1. Validates the body via the shared Zod schema (honeypot + all field rules).
 *  2. Derives the privacy-safe IP hash (never the raw IP).
 *  3. Delegates to the service (CAPTCHA, deduplication, master validation, persist, notify).
 *  4. Returns 201 {id, submitted_at} with the canonical success message.
 *
 * Rate limiting is applied as Express middleware in the routes file, NOT here, so it runs
 * before parsing — this lets the rate limiter reject bots without ever touching the body.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { abuseConfig } from '@/config';
import { enquiryService } from './enquiries.service';
import { validateEnquirySubmit } from './enquiries.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function ipHash(req: Request): string | null {
  const ip = req.ip ?? null;
  if (!ip) return null;
  return createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex').slice(0, 64);
}

/** POST /public/enquiries */
export const submit = wrap(async (req) => {
  const input = validateEnquirySubmit(req.body);
  const dto = await enquiryService.submit(input, ipHash(req));
  return { status: 201, body: success(dto, String(req.id), 'Enquiry submitted.') };
});

export const enquiryPublicController = { submit };
