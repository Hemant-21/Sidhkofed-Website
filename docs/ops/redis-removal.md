# Redis Removal Notes

Redis has been removed from the native production runtime.

## Replacement Behavior

| Previous Redis use | Replacement |
| --- | --- |
| Refresh-token sessions | PostgreSQL table `auth_refresh_sessions` |
| Login/refresh/logout/upload/enquiry rate limits | In-process fixed-window counters |
| Public/content JSON cache | In-process TTL cache |
| Permission resolution cache | In-process TTL cache |
| BullMQ scheduler | In-process timers |
| Scheduler lock | In-process lock |
| Readiness checks | PostgreSQL + storage only |

## Usability Impact

Normal CMS usage is unchanged:

- Login still issues access and refresh tokens.
- Refresh tokens still rotate.
- Refresh-token reuse still revokes the session.
- Logout still revokes the current session.
- Disabling a user still revokes all sessions.
- Public pages still load through PostgreSQL and Next.js.
- Scheduled publishing and expiry jobs still run on the app server.

Operational tradeoffs:

- Rate-limit counters reset when the API process restarts.
- In-process cache resets when the API process restarts.
- In-process scheduler is intended for one app server.
- If a second app server is added later, scheduler locking should move to PostgreSQL advisory locks.

## New Database Object

Migration:

```text
prisma/migrations/20260903180000_auth_refresh_sessions_postgres/migration.sql
```

Prisma model:

```text
prisma/schema.prisma
```

Table:

```text
auth_refresh_sessions
```

## Removed Production Env

Do not configure:

```env
REDIS_URL=
QUEUE_PREFIX=
SCHEDULER_JOB_ATTEMPTS=
SCHEDULER_JOB_BACKOFF_MS=
```

Keep:

```env
CACHE_TTL_SECONDS=300
SCHEDULER_LOCK_TTL_SECONDS=600
```
