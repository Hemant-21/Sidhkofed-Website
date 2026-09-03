import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  generateImageVariants,
  getStoredVariant,
  isVariantName,
  shouldGenerateVariants,
  toVariantManifest,
} from './media.variants';

describe('media variants', () => {
  it('generates webp thumb, card, and hero variants without enlarging small images', async () => {
    const source = await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 3,
        background: '#c16515',
      },
    })
      .png()
      .toBuffer();

    const variants = await generateImageVariants(
      source,
      'image/png',
      (name) => `media/2026/variants/asset-${name}.webp`,
      (name) => `/api/v1/public/media/asset/file?variant=${name}`,
    );
    const manifest = toVariantManifest(variants);

    expect(variants).toHaveLength(3);
    expect(variants.map((variant) => variant.name)).toEqual(['thumb', 'card', 'hero']);
    expect(variants[0]).toMatchObject({ contentType: 'image/webp', width: 320, height: 180 });
    expect(variants[1]).toMatchObject({ contentType: 'image/webp', width: 640, height: 360 });
    expect(variants[2]).toMatchObject({ contentType: 'image/webp', width: 640, height: 360 });
    expect(getStoredVariant(manifest, 'thumb')).toMatchObject({
      key: 'media/2026/variants/asset-thumb.webp',
      url: '/api/v1/public/media/asset/file?variant=thumb',
      mime_type: 'image/webp',
      width: 320,
      height: 180,
    });
  });

  it('only accepts known variant names and supported raster image mime types', () => {
    expect(isVariantName('thumb')).toBe(true);
    expect(isVariantName('full')).toBe(false);
    expect(shouldGenerateVariants('image/jpeg')).toBe(true);
    expect(shouldGenerateVariants('application/pdf')).toBe(false);
  });
});
