/**
 * Event field-definition repository (Issue 7) — the ONLY Prisma caller for the field-definitions
 * module (coding-standards §6). Moves persistence out of the service so the service holds business
 * logic only. Behaviour is unchanged; these are thin pass-throughs over the existing queries.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';

export type FieldDefinitionRow = Prisma.EventFieldDefinitionGetPayload<true>;

export async function eventTypeExists(eventTypeId: string): Promise<boolean> {
  const row = await prisma.eventType.findUnique({ where: { id: eventTypeId }, select: { id: true } });
  return row !== null;
}

export async function listByEventType(eventTypeId: string): Promise<FieldDefinitionRow[]> {
  return prisma.eventFieldDefinition.findMany({ where: { eventTypeId }, orderBy: { displayOrder: 'asc' } });
}

export async function countByKey(eventTypeId: string, fieldKey: string): Promise<number> {
  return prisma.eventFieldDefinition.count({ where: { eventTypeId, fieldKey } });
}

export async function create(data: Prisma.EventFieldDefinitionUncheckedCreateInput): Promise<FieldDefinitionRow> {
  return prisma.eventFieldDefinition.create({ data });
}

export async function findByIdForType(id: string, eventTypeId: string): Promise<FieldDefinitionRow | null> {
  return prisma.eventFieldDefinition.findFirst({ where: { id, eventTypeId } });
}

export async function update(id: string, data: Prisma.EventFieldDefinitionUncheckedUpdateInput): Promise<FieldDefinitionRow> {
  return prisma.eventFieldDefinition.update({ where: { id }, data });
}

export const fieldDefinitionRepository = {
  eventTypeExists,
  listByEventType,
  countByKey,
  create,
  findByIdForType,
  update,
};
