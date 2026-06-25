/**
 * Toolkit distribution controller — `/api/v1/admin/events/{event_id}/toolkit-distributions/*`
 * (API spec §6). HTTP-only.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { auditContext } from '@/shared/request-context';
import { toolkitDistributionService } from './toolkit-distributions.service';
import { validateDistributionCreate, validateDistributionUpdate } from './toolkit-distributions.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const list = wrap(async (req) => {
  const rows = await toolkitDistributionService.list(req.params.event_id as string);
  return { status: 200, body: success(rows, String(req.id)) };
});

export const detail = wrap(async (req) => {
  const dto = await toolkitDistributionService.getById(req.params.event_id as string, req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const create = wrap(async (req) => {
  const input = validateDistributionCreate(req.body);
  const dto = await toolkitDistributionService.create(req.params.event_id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Toolkit distribution recorded.') };
});

export const patch = wrap(async (req) => {
  const input = validateDistributionUpdate(req.body);
  const dto = await toolkitDistributionService.update(
    req.params.event_id as string,
    req.params.id as string,
    input,
    auditContext(req),
  );
  return { status: 200, body: success(dto, String(req.id), 'Toolkit distribution updated.') };
});

export const remove = wrap(async (req) => {
  await toolkitDistributionService.remove(req.params.event_id as string, req.params.id as string, auditContext(req));
  return { status: 200, body: success({ deleted: true }, String(req.id), 'Toolkit distribution deleted.') };
});

export const toolkitDistributionController = { list, detail, create, patch, remove };
