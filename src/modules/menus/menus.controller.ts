/**
 * Menu admin controller — `/api/v1/admin/menu-items/*` (API spec §6). HTTP-only: parse → validate →
 * call the service → return through the shared envelope. The admin list is a flat, unpaginated set
 * (navigation config is small and bounded — same precedent as nested toolkit items).
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { auditContext } from '@/shared/request-context';
import { menuService } from './menus.service';
import { validateMenuItemCreate, validateMenuItemUpdate, validateMenuReorder } from './menus.validators';
import { parseMenuFilters } from './menus.query';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

export const list = wrap(async (req) => {
  const rows = await menuService.list(parseMenuFilters(req));
  return { status: 200, body: success(rows, String(req.id)) };
});

export const create = wrap(async (req) => {
  const input = validateMenuItemCreate(req.body);
  const dto = await menuService.create(input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Menu item created.') };
});

export const detail = wrap(async (req) => {
  const dto = await menuService.getById(req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const input = validateMenuItemUpdate(req.body);
  const dto = await menuService.update(req.params.id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Menu item updated.') };
});

export const reorder = wrap(async (req) => {
  const input = validateMenuReorder(req.body);
  const rows = await menuService.reorder(input, auditContext(req));
  return { status: 200, body: success(rows, String(req.id), 'Menu items reordered.') };
});

export const remove = wrap(async (req) => {
  const body = (req.body ?? {}) as { confirm?: unknown };
  const confirm = req.query.confirm === 'true' || body.confirm === true;
  const result = await menuService.remove(req.params.id as string, confirm, auditContext(req));
  return { status: 200, body: success({ deleted: true, ...result }, String(req.id), 'Menu item deleted.') };
});

export const menuController = { list, create, detail, patch, reorder, remove };
