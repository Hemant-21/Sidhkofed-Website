import { prisma, disconnectDatabase } from '@/db/prisma';
import { appConfig } from '@/config';
import { storage } from '@/services/storage';
import { Prisma } from '@prisma/client';
import {
  generateImageVariants,
  shouldGenerateVariants,
  toVariantManifest,
  type MediaVariantName,
} from '@/modules/media/media.variants';

function deliveryEndpoint(id: string, variant: MediaVariantName): string {
  return `${appConfig.apiBasePath}/public/media/${id}/file?variant=${variant}`;
}

function yearFromStorageKey(storageKey: string): string {
  return storageKey.match(/^media\/(\d{4})\//)?.[1] ?? String(new Date().getFullYear());
}

async function main(): Promise<void> {
  const rows = await prisma.mediaAsset.findMany({
    where: {
      archivedAt: null,
      variants: { equals: Prisma.DbNull },
      OR: [
        { mimeType: 'image/jpeg' },
        { mimeType: 'image/png' },
        { mimeType: 'image/webp' },
        { mimeType: 'image/gif' },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of rows) {
    try {
      if (!shouldGenerateVariants(asset.mimeType)) {
        skipped += 1;
        continue;
      }
      const original = await storage.get(asset.storageKey);
      const year = yearFromStorageKey(asset.storageKey);
      const variants = await generateImageVariants(
        original,
        asset.mimeType,
        (variant) => `media/${year}/variants/${asset.id}-${variant}.webp`,
        (variant) => deliveryEndpoint(asset.id, variant),
      );
      await Promise.all(
        variants.map((variant) =>
          storage.put({ key: variant.key, body: variant.body, contentType: variant.contentType }),
        ),
      );
      const manifest = toVariantManifest(variants);
      if (!manifest) {
        skipped += 1;
        continue;
      }
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { variants: manifest } });
      generated += 1;
      console.log(`generated variants for ${asset.id} (${asset.fileName})`);
    } catch (error) {
      failed += 1;
      console.error(`failed variants for ${asset.id} (${asset.fileName}):`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`thumbnail backfill complete: generated=${generated}, skipped=${skipped}, failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
