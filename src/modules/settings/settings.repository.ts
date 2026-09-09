/**
 * Settings repository — the only Prisma caller for the settings module.
 */
import { prisma } from '@/db/prisma';

interface SettingRow {
  key: string;
  valueText: string | null;
  valueJson: unknown;
}

async function findAll(): Promise<SettingRow[]> {
  return prisma.setting.findMany({ select: { key: true, valueText: true, valueJson: true } });
}

async function findByKey(key: string): Promise<SettingRow | null> {
  return prisma.setting.findUnique({ where: { key }, select: { key: true, valueText: true, valueJson: true } });
}

/** Upsert a single setting key (idempotent). */
async function upsert(
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
