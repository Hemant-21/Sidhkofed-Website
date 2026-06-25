/**
 * Generic masters controller — drives every master through `/api/v1/admin/masters/:master_key`
 * and `/api/v1/public/masters/:master_key` (API spec §4/§5). One thin HTTP layer; all
 * per-master behavior comes from the registry + base service.
 */
import type { Request, Response, NextFunction } from 'express';
import { success, paginated } from '@/shared/envelope';
import { NotFoundError } from '@/shared/errors';
import { resolvePageParams, buildPagination } from '@/shared/pagination';
import { auditContext } from '@/shared/request-context';
import { getMaster } from './masters.registry';
import { baseMasterService } from './base-master.service';
import type { MasterDefinition } from './masters.types';

const wrap =
  (fn: (req: Request) => Promise<{ status: number; body: unknown }>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req)
      .then(({ status, body }) => res.status(status).json(body))
      .catch(next);
  };

function resolveDef(req: Request, requirePublic = false): MasterDefinition {
  const key = req.params.master_key as string;
  const def = getMaster(key);
  if (!def || (requirePublic && !def.isPublic)) {
    throw new NotFoundError(`Unknown master "${key}".`);
  }
  return def;
}

// ── Admin ───────────────────────────────────────────────────────────────────
export const list = wrap(async (req) => {
  const def = resolveDef(req);
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const { items, total } = await baseMasterService.adminList(def, req.query as Record<string, unknown>, page);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const create = wrap(async (req) => {
  const def = resolveDef(req);
  const dto = await baseMasterService.create(def, req.body, auditContext(req));
  return { status: 201, body: success(dto, String(req.id), `${def.label} created.`) };
});

export const detail = wrap(async (req) => {
  const def = resolveDef(req);
  const dto = await baseMasterService.getById(def, req.params.id as string);
  return { status: 200, body: success(dto, String(req.id)) };
});

export const patch = wrap(async (req) => {
  const def = resolveDef(req);
  const dto = await baseMasterService.update(def, req.params.id as string, req.body, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), `${def.label} updated.`) };
});

export const activate = wrap(async (req) => {
  const def = resolveDef(req);
  const dto = await baseMasterService.setActive(def, req.params.id as string, true, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), `${def.label} activated.`) };
});

export const deactivate = wrap(async (req) => {
  const def = resolveDef(req);
  const dto = await baseMasterService.setActive(def, req.params.id as string, false, auditContext(req));
  return { status: 200, body: success(dto, String(req.id), `${def.label} deactivated.`) };
});

// ── Public (active records only; cached) ─────────────────────────────────────
export const publicList = wrap(async (req) => {
  const def = resolveDef(req, true);
  const page = resolvePageParams(req.query.page, req.query.page_size);
  const { items, total } = await baseMasterService.publicList(def, req.query as Record<string, unknown>, page);
  return { status: 200, body: paginated(items, buildPagination(total, page), String(req.id)) };
});

export const mastersController = { list, create, detail, patch, activate, deactivate, publicList };
