/**
 * Users admin + self-service profile controller — `/api/v1/admin/users/*` and
 * `/api/v1/admin/profile*` (HTTP-only: parse → validate → call the service → return through the
 * shared envelope). No business logic, no Prisma here.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { userService } from './users.service';
import {
  validateUserCreate,
  validateUserUpdate,
  validateUserPassword,
  validateUserStatus,
  validateProfileUpdate,
  validateProfilePassword,
} from './users.validators';
import { parseUserFilters, parseUserOrdering } from './users.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

// ── Admin user management ──────────────────────────────────────────────────────
export const list = wrap(async (req) => {
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const filters = parseUserFilters(req);
  const ordering = parseUserOrdering(req);
  const { items, total } = await userService.list(filters, ordering, page.skip, page.take);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await userService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const create = wrap(async (req) => {
  const input = validateUserCreate(req.body);
  const dto = await userService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'User created.') };
});

export const patch = wrap(async (req) => {
  const input = validateUserUpdate(req.body);
  const dto = await userService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'User updated.') };
});

export const password = wrap(async (req) => {
  const input = validateUserPassword(req.body);
  await userService.resetPassword(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success({ id: req.params.id }, String(req.id), 'Password reset.') };
});

export const status = wrap(async (req) => {
  const input = validateUserStatus(req.body);
  const dto = await userService.setStatus(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'User status updated.') };
});

// ── Self-service profile ───────────────────────────────────────────────────────
export const profileUpdate = wrap(async (req) => {
  const input = validateProfileUpdate(req.body);
  const dto = await userService.updateOwnProfile(input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Profile updated.') };
});

export const profilePassword = wrap(async (req) => {
  const input = validateProfilePassword(req.body);
  await userService.changeOwnPassword(input, auditContext(req));
  return { status: 200, body: success({ id: req.user?.id }, String(req.id), 'Password changed.') };
});

export const userController = { list, detail, create, patch, password, status, profileUpdate, profilePassword };
