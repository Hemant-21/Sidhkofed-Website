/**
 * Settings repository — the only Prisma caller for the settings module.
 */
import { prisma } from '@/db/prisma';

export interface SettingRow {
  key: string;
  valueText: string | null;
  valueJson: unknown;
}

export async function findAll(): Promise<SettingRow[]> {
  return prisma.setting.findMany({ select: { key: true, valueText: true, valueJson: true } });
}

export async function findByKey(key: string): Promise<SettingRow | null> {
  return prisma.setting.findUnique({ where: { key }, select: { key: true, valueText: true, valueJson: true } });
}

/** Upsert a single setting key (idempotent). */
export async function upsert(
  key: string,
  valueText: string | null,
  valueJson: unknown,
  updatedById: string | null,
  description?: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { valueText, valueJson: valueJson ?? undefined, updatedById, description },
    create: { key, valueText, valueJson: valueJson ?? undefined, updatedById, description },
  });
}

export const settingsRepository = { findAll, findByKey, upsert };
