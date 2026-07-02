/**
 * Toolkit item controller — `/api/v1/admin/toolkits/{id}/items/*` (API spec §6). HTTP-only.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { auditContext } from '@/shared/request-context';
import { toolkitItemService } from './items.service';
import { validateToolkitItemCreate, validateToolkitItemUpdate } from './items.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const list = wrap(async (req) => {
  const rows = await toolkitItemService.list(req.params.id as string);
  return { status: 200, body: success(rows, String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await toolkitItemService.getById(req.params.id as string, req.params.item_id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const create = wrap(async (req) => {
  const input = validateToolkitItemCreate(req.body);
  const dto = await toolkitItemService.create(req.params.id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Toolkit item created.') };
});

export const patch = wrap(async (req) => {
  const input = validateToolkitItemUpdate(req.body);
  const dto = await toolkitItemService.update(req.params.id as string, req.params.item_id as string, input, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Toolkit item updated.') };
});

export const remove = wrap(async (req) => {
  await toolkitItemService.remove(req.params.id as string, req.params.item_id as string, auditContext(req));
  return { status: 200, body: success({ deleted: true }, String(req.id), 'Toolkit item deleted.') };
});

export const toolkitItemController = { list, detail, create, patch, remove };
