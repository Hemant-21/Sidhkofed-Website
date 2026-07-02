/**
 * Auth request validators (TASK 12). Zod schemas validated server-side; failures throw
 * the shared `ValidationError` so the error middleware renders the single §1.4 envelope
 * with `error.fields` keyed by the snake_case request field.
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

/** Run a schema and throw `ValidationError` (field-keyed) on failure. */
function parse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

/** `POST /auth/login` — email normalized (trim + lowercase); password required. */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'This field is required.' })
    .trim()
    .min(1, 'This field is required.')
    .email('Enter a valid email address.')
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: 'This field is required.' })
    .min(1, 'This field is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;
export const validateLogin = (payload: unknown): LoginInput => parse(loginSchema, payload);

/**
 * `POST /auth/refresh` / `POST /auth/logout` — the refresh token arrives via the
 * HttpOnly cookie (browser) OR `refresh_token` in the body (native client). The body
 * token is therefore optional here; the controller resolves cookie-or-body.
 */
export const refreshTokenBodySchema = z.object({
  refresh_token: z.string().trim().min(1).optional(),
});
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export const validateRefreshBody = (payload: unknown): RefreshTokenBody =>
  parse(refreshTokenBodySchema, payload ?? {});
