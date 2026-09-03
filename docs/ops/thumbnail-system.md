# Self-hosted Thumbnail System

The CMS generates image variants locally with the open-source `sharp` package. No paid image service, CDN, or external processing API is required.

## What Is Generated

For uploaded JPEG, PNG, WebP, and GIF files, the backend creates three WebP variants:

| Variant | Width | Intended use |
| --- | ---: | --- |
| `thumb` | 320 px | Gallery strips, compact previews |
| `card` | 768 px | Listing cards and normal content images |
| `hero` | 1280 px | Homepage/detail hero images |

Images are not enlarged beyond their original width. EXIF orientation is applied during processing, and the derived files are stored as WebP.

## Where It Lives

- Original upload pipeline: `src/modules/media/media.service.ts`
- Variant generation helpers: `src/modules/media/media.variants.ts`
- Public/admin variant URLs: `src/modules/media/media.dto.ts`
- Variant query parsing: `src/modules/media/media.controller.ts`
- Database field: `prisma/schema.prisma`, `MediaAsset.variants`
- Migration: `prisma/migrations/20260903193000_media_thumbnail_variants/migration.sql`
- Backfill command: `scripts/media/backfill-variants.ts`
- Website media URL helper: `SIDHKOFED_WEB/src/utils/media-url.ts`

## Storage Layout

Variants are stored beside original media in the configured storage backend:

```text
media/{year}/{media-id}.{original-extension}
media/{year}/variants/{media-id}-thumb.webp
media/{year}/variants/{media-id}-card.webp
media/{year}/variants/{media-id}-hero.webp
```

In production, point the app server's media storage root to the NFS-mounted shared directory. The database stores only variant metadata in `media_assets.variants`; the image bytes remain on the NFS volume.

## Runtime URLs

Original file:

```text
/api/v1/public/media/{id}/file
```

Variant files:

```text
/api/v1/public/media/{id}/file?variant=thumb
/api/v1/public/media/{id}/file?variant=card
/api/v1/public/media/{id}/file?variant=hero
```

If a legacy image has no variant metadata yet, the backend falls back to the original file.

## Backfill Existing Media

After deploying the migration and configuring storage, generate variants for existing image uploads:

```powershell
npm.cmd run media:backfill-thumbnails
```

The command only processes active image assets whose `variants` field is still null.

## Production Notes

- Keep the NFS path writable by the IIS app-pool identity or service account running Node.
- Keep enough free disk space for originals plus derived variants.
- Include both original media and the `variants` folders in backup/restore procedures.
- Re-run the backfill command after importing legacy media.
