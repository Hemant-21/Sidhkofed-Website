# Media Module (+ Storage, Usage, Galleries, Videos)

Reusable media library plus the storage abstraction, usage tracking, galleries, and
YouTube videos — the shared infrastructure every future content module links against.

## Storage abstraction (dependency inversion)

`src/services/storage` exposes a single `StorageService` interface; modules import the
shared `storage` instance and never know the backend.

```
StorageService: put(upload) · replace · get · delete · exists · stat(metadata) · getUrl/getPublicUrl · healthCheck
   ├── LocalStorageService  (filesystem; dev / single-node)
   └── S3StorageService     (S3-compatible; private objects + signed URLs)
```

Selected by `STORAGE_PROVIDER`. Files live outside the DB; Postgres stores metadata only.

## Media flow (upload)

```
multer(memory) → controller → service
   service: validate(size/mime/extension/magic-bytes) → virus-scan hook →
            checksum(sha256) → storage.put → storage.getPublicUrl →
            repo.create(media_assets) → Redis cache → audit(MEDIA_UPLOAD)
```

- **Validation** (`media.validation.ts`, pure/testable): size limits (from Settings),
  MIME + extension allow-list, and magic-byte sniffing to confirm content matches the
  declared type. Supports images, PDF, Word, Excel, ZIP. Videos are metadata-only (no
  file upload — see Videos).
- **Metadata stored** (`media_assets`): `storage_key` (private, never returned),
  `url`, `file_name` (original), `mime_type`, `file_size_bytes`, `width`/`height`
  (best-effort), `title`/`alt_text`/`caption`, `checksum`, `uploaded_by`, archive +
  replace chain. `extension` is derived in the DTO.
- **Hooks (Phase 3 seams)**: `scanForViruses` (behind `MALWARE_SCAN_ENABLED`),
  `optimizeImage`, `generateThumbnail` — wired but no-op until implemented.
- **Redis cache**: per-asset metadata (`media:meta:<id>`), invalidated on every change.

## Media usage tracking (delete protection)

`media-usage.service.ts` — future modules register where assets are used so linked media
cannot be hard-deleted (archive only).

```ts
await mediaUsageService.registerUsage({ mediaId, entityType: 'gallery', entityId, field: 'image' }, tx);
await mediaUsageService.removeUsage(ref, tx);
await mediaUsageService.whereUsed(mediaId);   // → [{ entityType, entityId, field, createdAt }]
await mediaUsageService.isUsed(mediaId);       // → boolean (blocks hard-delete)
```

Galleries and Videos already register/unregister usage transactionally for covers,
gallery images, and video thumbnails.

## APIs

**Media** (`/api/v1/admin/media`): `POST /` (and alias `POST /upload`), `POST /bulk-upload`,
`GET /` (filters `mime_type`, `archived`, `search`, `used_by`), `GET /:id`, `PATCH /:id`,
`POST /:id/archive`, `POST /:id/restore`, `POST /:id/replace-file`, `GET /:id/usages`.

**Galleries** (`/api/v1/admin/galleries`): `POST`, `GET`, `GET /:id`, `PATCH /:id`,
lifecycle `publish|unpublish|archive|restore`, images `POST /:id/images`,
`POST /:id/images/reorder`, `PATCH|DELETE /:id/images/:imageId`.

**Videos** (`/api/v1/admin/videos`): `POST`, `GET`, `GET /:id`, `PATCH /:id`,
`POST /validate-url`, lifecycle `publish|unpublish|archive|restore`. YouTube-only;
URL parsed/normalized; ≤3 featured homepage videos enforced at publish (`409` over cap).

## RBAC

- Media / Galleries / Videos create-edit: Super Admin, Content Editor, Publisher.
- Lifecycle (galleries/videos publish/unpublish/archive/restore): Super Admin + Publisher.
- (Settings & Audit: Super Admin only — see their docs.)

## Future extension points

- Implement the virus-scan, image-optimization, and thumbnail hooks.
- Add public read endpoints (`/public/galleries`, `/public/videos`) when content modules land.
- Re-add the trimmed content back-relations (event/document/etc. covers) on `media_assets`
  as those modules are built (additive migrations).
- Replace best-effort dimension reading with a proper image library if richer metadata is needed.
