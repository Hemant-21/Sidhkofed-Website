import sharp from 'sharp';
import type { Prisma } from '@prisma/client';

export type MediaVariantName = 'thumb' | 'card' | 'hero';

export interface StoredMediaVariant {
  key: string;
  url: string;
  mime_type: 'image/webp';
  file_size: number;
  width: number;
  height: number;
}

export type StoredMediaVariantMap = Partial<Record<MediaVariantName, StoredMediaVariant>>;

interface VariantSpec {
  name: MediaVariantName;
  width: number;
  quality: number;
}

const VARIANTS: VariantSpec[] = [
  { name: 'thumb', width: 320, quality: 72 },
  { name: 'card', width: 768, quality: 78 },
  { name: 'hero', width: 1280, quality: 82 },
];

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function isVariantName(value: unknown): value is MediaVariantName {
  return value === 'thumb' || value === 'card' || value === 'hero';
}

export function shouldGenerateVariants(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

export async function generateImageVariants(
  buffer: Buffer,
  mimeType: string,
  keyForVariant: (name: MediaVariantName) => string,
  urlForVariant: (name: MediaVariantName) => string,
): Promise<Array<{ name: MediaVariantName; key: string; url: string; body: Buffer; contentType: 'image/webp'; width: number; height: number }>> {
  if (!shouldGenerateVariants(mimeType)) return [];

  const image = sharp(buffer, { animated: false, failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) return [];

  const results = await Promise.all(
    VARIANTS.map(async (variant) => {
      const body = await sharp(buffer, { animated: false, failOn: 'none' })
        .rotate()
        .resize({
          width: variant.width,
          withoutEnlargement: true,
        })
        .webp({ quality: variant.quality })
        .toBuffer();

      const meta = await sharp(body).metadata();
      return {
        name: variant.name,
        key: keyForVariant(variant.name),
        url: urlForVariant(variant.name),
        body,
        contentType: 'image/webp' as const,
        width: meta.width ?? Math.min(metadata.width!, variant.width),
        height: meta.height ?? Math.round((metadata.height! / metadata.width!) * Math.min(metadata.width!, variant.width)),
      };
    }),
  );

  return results;
}

export function toVariantManifest(
  variants: Array<{ name: MediaVariantName; key: string; url: string; body: Buffer; contentType: 'image/webp'; width: number; height: number }>,
): Prisma.InputJsonObject | null {
  if (variants.length === 0) return null;
  return Object.fromEntries(
    variants.map((variant) => [
      variant.name,
      {
        key: variant.key,
        url: variant.url,
        mime_type: variant.contentType,
        file_size: variant.body.byteLength,
        width: variant.width,
        height: variant.height,
      },
    ]),
  ) as Prisma.InputJsonObject;
}

export function getStoredVariant(
  variants: unknown,
  name: MediaVariantName,
): StoredMediaVariant | null {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return null;
  const candidate = (variants as Record<string, unknown>)[name];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const v = candidate as Partial<StoredMediaVariant>;
  if (
    typeof v.key !== 'string' ||
    typeof v.url !== 'string' ||
    v.mime_type !== 'image/webp' ||
    typeof v.file_size !== 'number' ||
    typeof v.width !== 'number' ||
    typeof v.height !== 'number'
  ) {
    return null;
  }
  return {
    key: v.key,
    url: v.url,
    mime_type: v.mime_type,
    file_size: v.file_size,
    width: v.width,
    height: v.height,
  };
}
