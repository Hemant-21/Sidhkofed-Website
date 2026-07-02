# Audit Module

The single, centralized, append-only audit system. Every state-changing module records
through it; the auth module's Phase 2 calls were migrated to it (the old
`@/services/audit` path is now a re-export shim — one system, not two).

## Architecture

```
auditService.{log,create,update,delete,publish,unpublish,archive,restore,record}
        │
        └── insert → prisma(audit_logs)        (append-only; never updated/deleted)

audit.controller → audit.repository → prisma(audit_logs)   (read-only list/detail)
```

- `audit.events.ts` maps each **semantic event** the app emits onto the approved
  `AuditAction` DB enum (Part 9). The enum is compact by design; the precise event name
  is preserved in `change_summary` and `metadata.event`.
- Writes are resilient: a failed insert is logged, never thrown — auditing must not break
  the business operation.

## Captured fields (mapped to the approved schema)

| Task concept | `audit_logs` column |
|---|---|
| user | `user_id` |
| entity | `module` |
| entity_id | `record_id` |
| action | `action` (enum) + `metadata.event` (precise) |
| old_values / new_values | `metadata.old_values` / `metadata.new_values` |
| ip_address | `ip_hash` (sha256, privacy-safe — never the raw IP) |
| user_agent | `metadata.user_agent` |
| timestamp | `created_at` |

## Events

`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `PUBLISH`,
`UNPUBLISH`, `ARCHIVE`, `RESTORE`, `SETTINGS_CHANGE`, `MEDIA_UPLOAD`, `MEDIA_REPLACE`,
`MEDIA_ARCHIVE`.

Enum mapping (event → `AuditAction`): login events → `login`; `SETTINGS_CHANGE` →
`config_change`; `MEDIA_REPLACE` → `media_replace`; `MEDIA_UPLOAD` → `create`;
`MEDIA_ARCHIVE`/`DELETE` → `archive`; the rest map to their same-named enum member.

## Usage (from any module)

```ts
import { auditService } from '@/modules/audit/audit.service';

await auditService.create(ctx, 'gallery', gallery.id, { title_en });
await auditService.update(ctx, 'media', id, oldValues, newValues);
await auditService.publish(ctx, 'video', id, { previousState, newState });
await auditService.log('MEDIA_UPLOAD', ctx, { module: 'media', recordId });
```

`ctx` (`AuditContext`) carries `userId`, `ipHash`, `userAgent` — build it with
`auditContext(req)` from `@/shared/request-context`.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/audit-logs` | Filters: `module`, `record_id`, `user_id`, `action`, `date_from`, `date_to`; `ordering=-created_at\|created_at`; paginated. |
| GET | `/api/v1/admin/audit-logs/:id` | Single entry. |

## RBAC

Read-only, Super Admin only (API spec §6/§8).

## Future extension points

- Range-partition `audit_logs` by `created_at` (monthly) at scale (schema Part 12).
- Add a `DELETE`-specific enum member if hard-deletes need first-class reporting.
