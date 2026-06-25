/**
 * Event field-definition service (API spec §6) — Super Admin manages the controlled per-event-type
 * dynamic-field schema. CRUD + activate/deactivate, duplicate-key protection, and audit. No Prisma
 * here (this module owns its small repository inline via the shared prisma client through the
 * events repository's namespace is avoided — it uses its own thin repository).
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import type { FieldDefinitionCreateInput, FieldDefinitionUpdateInput } from './field-definitions.validators';

const ENTITY = 'event_field_definition';

function toDto(row: {
  id: string;
  eventTypeId: string;
  fieldKey: string;
  labelEn: string;
  labelHi: string | null;
  dataType: string;
  isRequired: boolean;
  options: Prisma.JsonValue;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  return {
    id: row.id,
    event_type_id: row.eventTypeId,
    field_key: row.fieldKey,
    label_en: row.labelEn,
    label_hi: row.labelHi,
    data_type: row.dataType,
    is_required: row.isRequired,
    options: Array.isArray(row.options) ? row.options : null,
    display_order: row.displayOrder,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

async function assertEventTypeExists(eventTypeId: string): Promise<void> {
  const row = await prisma.eventType.findUnique({ where: { id: eventTypeId }, select: { id: true } });
  if (!row) throw new NotFoundError('Event type not found.');
}

export async function list(eventTypeId: string): Promise<Record<string, unknown>[]> {
  await assertEventTypeExists(eventTypeId);
  const rows = await prisma.eventFieldDefinition.findMany({ where: { eventTypeId }, orderBy: { displayOrder: 'asc' } });
  return rows.map(toDto);
}

export async function create(eventTypeId: string, input: FieldDefinitionCreateInput, ctx: AuditContext): Promise<Record<string, unknown>> {
  await assertEventTypeExists(eventTypeId);
  const duplicate = await prisma.eventFieldDefinition.count({ where: { eventTypeId, fieldKey: input.field_key } });
  if (duplicate > 0) throw new ConflictError(`A field with key "${input.field_key}" already exists for this event type.`);

  const created = await prisma.eventFieldDefinition.create({
    data: {
      eventTypeId,
      fieldKey: input.field_key,
      labelEn: input.label_en,
      labelHi: input.label_hi ?? null,
      dataType: input.data_type,
      isRequired: input.is_required ?? false,
      options: input.options ? (input.options as Prisma.InputJsonValue) : Prisma.JsonNull,
      displayOrder: input.display_order ?? 0,
      isActive: input.is_active ?? true,
    },
  });
  await auditService.create(ctx, ENTITY, created.id, { event_type_id: eventTypeId, field_key: created.fieldKey });
  return toDto(created);
}

export async function update(
  eventTypeId: string,
  id: string,
  input: FieldDefinitionUpdateInput,
  ctx: AuditContext,
): Promise<Record<string, unknown>> {
  const existing = await prisma.eventFieldDefinition.findFirst({ where: { id, eventTypeId } });
  if (!existing) throw new NotFoundError('Field definition not found.');

  // Changing data_type away from select must clear options; to select must set them.
  const nextType = input.data_type ?? existing.dataType;
  let options: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (input.options !== undefined) options = input.options as Prisma.InputJsonValue;
  else if (input.data_type !== undefined && nextType !== 'select') options = Prisma.JsonNull;
  if (nextType === 'select') {
    const effective = input.options ?? (Array.isArray(existing.options) ? existing.options : null);
    if (!effective || (Array.isArray(effective) && effective.length === 0)) {
      throw new ValidationError({ options: ['options is required for a select field.'] });
    }
  }

  const updated = await prisma.eventFieldDefinition.update({
    where: { id },
    data: {
      fieldKey: input.field_key,
      labelEn: input.label_en,
      labelHi: input.label_hi,
      dataType: input.data_type,
      isRequired: input.is_required,
      ...(options !== undefined ? { options } : {}),
      displayOrder: input.display_order,
      isActive: input.is_active,
    },
  });
  await auditService.update(ctx, ENTITY, id, undefined, { field_key: updated.fieldKey });
  return toDto(updated);
}

export async function setActive(eventTypeId: string, id: string, isActive: boolean, ctx: AuditContext): Promise<Record<string, unknown>> {
  const existing = await prisma.eventFieldDefinition.findFirst({ where: { id, eventTypeId } });
  if (!existing) throw new NotFoundError('Field definition not found.');
  const updated = await prisma.eventFieldDefinition.update({ where: { id }, data: { isActive } });
  await auditService.log('UPDATE', ctx, {
    module: ENTITY,
    recordId: id,
    summary: isActive ? 'FIELD_DEFINITION_ACTIVATED' : 'FIELD_DEFINITION_DEACTIVATED',
    previousState: String(existing.isActive),
    newState: String(isActive),
  });
  return toDto(updated);
}

export const fieldDefinitionService = { list, create, update, setActive };
