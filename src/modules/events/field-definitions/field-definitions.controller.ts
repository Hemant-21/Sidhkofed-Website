/**
 * Event field-definition controller — `/api/v1/admin/event-types/{event_type_id}/field-definitions`
 * (API spec §6). Super Admin only (enforced at the route). HTTP-only.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { auditContext } from '@/shared/request-context';
import { fieldDefinitionService } from './field-definitions.service';
import { validateFieldDefinitionCreate, validateFieldDefinitionUpdate } from './field-definitions.validators';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req).then(({ status, body }) => res.status(status).json(body)).catch(next);
  };

export const list = wrap(async (req) => {
  const rows = await fieldDefinitionService.list(req.params.event_type_id as string);
  return { status: 200, body: success(rows, String(req.id)) };
});

export const create = wrap(async (req) => {
  const input = validateFieldDefinitionCreate(req.body);
  const dto = await fieldDefinitionService.create(req.params.event_type_id as string, input, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), 'Field definition created.') };
});

export const patch = wrap(async (req) => {
  const input = validateFieldDefinitionUpdate(req.body);
  const dto = await fieldDefinitionService.update(
    req.params.event_type_id as string,
    req.params.id as string,
    input,
    auditContext(req),
  );
  return { status: 200, body: success(dto, String(req.id), 'Field definition updated.') };
});

export const activate = wrap(async (req) => {
  const dto = await fieldDefinitionService.setActive(req.params.event_type_id as string, req.params.id as string, true, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Field definition activated.') };
});

export const deactivate = wrap(async (req) => {
  const dto = await fieldDefinitionService.setActive(req.params.event_type_id as string, req.params.id as string, false, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), 'Field definition deactivated.') };
});

export const fieldDefinitionController = { list, create, patch, activate, deactivate };
