# Claude Codebase Context

## 1. Project Summary

- SIDHKOFED is currently a modular monolith backend plus two separate Next.js frontends:
  - Root app: Express + TypeScript API at `/api/v1`
  - `admin/`: CMS/admin frontend on Next.js App Router
  - `web/`: public website on Next.js App Router
- The repo is not a single Next.js full-stack app. The API is the source of truth for data and business rules.
- The project is content/CMS focused, not ERP/MIS. Many modules share one publishing/lifecycle pattern.
- There is also a `legacy-prototype/` folder containing the earlier static prototype and it should not be overwritten casually.

## 2. Tech Stack

| Area | Current stack |
|---|---|
| Backend framework | Express 4 + TypeScript |
| Frontend framework | Next.js 14 App Router in both `admin/` and `web/` |
| Language | TypeScript across backend and both frontends |
| Styling | Tailwind CSS + shared semantic CSS variables in `globals.css` |
| State/data fetching | Axios + TanStack Query on admin; `fetch`/Axios helpers on web |
| Forms | React Hook Form + Zod in admin |
| Validation | Zod on backend and admin; backend is authoritative |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT access token + HttpOnly refresh cookie |
| Queue/background jobs | BullMQ + Redis |
| Logging | Pino / `pino-http` |
| File storage | Local or S3-style storage via backend abstraction |
| Testing | Vitest; root also has integration tests under `tests/` |
| Deployment shape | Separate backend/admin/web runtimes, each with Docker-related config |

- Backend entrypoints:
  - `src/server.ts`
  - `src/app.ts`
- Admin entrypoint:
  - `admin/src/app/layout.tsx`
- Public web entrypoint:
  - `web/src/app/layout.tsx`

## 3. Folder Structure

| Path | Purpose |
|---|---|
| `src/` | Express API source |
| `src/modules/` | Vertical backend modules: routes/controller/service/repository/validators/dto |
| `src/shared/` | Shared backend helpers: envelope, validation, visibility, publishing, pagination, errors |
| `src/middleware/` | Auth, RBAC, validation, logging, rate limiting, error handling |
| `src/services/` | Cross-cutting infra services: Redis, storage, email, captcha, cache |
| `src/jobs/` | Scheduler and BullMQ jobs |
| `src/config/` | Typed backend config from env |
| `src/db/` | Prisma connection layer |
| `src/routes/` | API route aggregation |
| `prisma/` | Prisma schema, migrations, seeds |
| `admin/src/app/` | Next App Router pages for CMS |
| `admin/src/features/` | Feature-oriented admin UI modules |
| `admin/src/components/` | Reusable admin UI/form/layout/table components |
| `admin/src/lib/` | API helpers, query helpers, validation helpers |
| `web/src/app/` | Next App Router pages for public site |
| `web/src/components/` | Reusable public-site UI/content/listing/detail/layout components |
| `web/src/lib/` | Public API clients, endpoints, SEO, types |
| `docs/` | Architecture, API, operational, acceptance, and planning docs |
| `tests/` | Root integration tests against backend modules |
| `scripts/` | Smoke, DB, backup/restore, fixture scripts |
| `legacy-prototype/` | Older static prototype kept for reference |

### Key backend module families

- Auth / RBAC: `src/modules/auth/`
- Users / profile: `src/modules/users/`
- Audit / settings / search / dashboard
- Content modules:
  - events + news
  - programmes
  - toolkits
  - institutions
  - documents
  - official communications
  - tenders
  - procurement updates
  - pages
  - menus
  - faqs
  - digital services
  - galleries
  - videos
  - memberships
  - enquiries
  - home aggregate

## 4. Application Modules

### Public website modules already present in `web/src/app/`

- Home: `/`
- About:
  - `/about`
  - `/about/organisation-governance`
  - `/about/vision-mission-objectives-functions`
- Activities:
  - `/activities`
  - `/activities/trainings`
  - `/activities/workshops-awareness`
  - `/activities/institutional-events`
  - `/activities/success-stories`
- Membership:
  - `/membership`
  - `/memberships`
- Institutions:
  - `/institutions`
  - `/institutions/[slug]`
- Programmes:
  - `/programmes`
  - `/programmes/[slug]`
- Events:
  - `/events`
  - `/events/[slug]`
- News:
  - `/news`
  - `/news/[slug]`
- Toolkits:
  - `/toolkits`
  - `/toolkits/[slug]`
- Documents / publications:
  - `/documents`
  - `/documents/[slug]`
  - `/publications`
  - `/publications/forms-formats`
  - `/publications/reports-research`
  - `/publications/policies-guidelines-sops`
  - `/publications/training-materials`
  - `/publications/media`
  - `/publications/media/galleries`
  - `/publications/media/videos`
- Notifications / governance:
  - `/notifications`
  - `/notifications/notices`
  - `/notifications/notices/[slug]`
  - `/notifications/tenders`
  - `/notifications/tenders/[slug]`
- Procurement:
  - `/procurement`
  - `/procurement/announcements`
  - `/procurement/announcements/[slug]`
  - `/procurement/upcoming`
  - `/procurement/enquiry`
- Dashboard / impact:
  - `/impact`
  - `/impact/dashboard`
  - `/impact/dashboard/[report]`
  - `/impact/training-beneficiaries`
- Others:
  - `/faqs`
  - `/digital-services`
  - `/official-communications`
  - `/official-communications/[slug]`
  - `/galleries/[slug]`
  - `/videos/[slug]`
  - `/knowledge-centre`
  - `/search`
  - `/contact`
  - `/privacy-policy`
  - `/disclaimer`

### Admin/CMS modules already present in `admin/src/app/(admin)/`

- Dashboard
- Search
- Events
- News
- Programmes
- Toolkits
- Institutions
- Documents
- Knowledge Centre
- Official Communications
- Tenders
- Procurement Updates
- Pages
- Menus
- Media
- Galleries
- Videos
- Memberships
- Digital Services
- Masters
- Roles
- Audit log
- Settings
- Profile
- Enquiries placeholder
- Success Stories placeholder

### SIDHKOFED-specific patterns already implemented

- Bilingual content fields (`*_en`, `*_hi`)
- Publishing lifecycle (`draft`, `published`, `unpublished`, `archived`)
- Public visibility + homepage flags
- Dashboard reports, metrics, datasets
- Institutional memberships
- Procurement updates
- Event-to-news flow
- Knowledge Centre via documents
- Menus and pages as CMS-driven content

## 5. Public Website Flow

- The public website does not talk to the database directly.
- It only consumes backend public endpoints under `/api/v1/public/*`.
- Server Components use `web/src/lib/api/server.ts`:
  - fetches backend directly using absolute `BACKEND_ORIGIN`
  - supports Next revalidation and tags
- Client-side interactive widgets use `web/src/lib/api/client.ts`:
  - browser requests go to proxied same-origin `/api/v1`
- Public endpoint constants live in `web/src/lib/api/endpoints.ts`.
- Next rewrites `/api/:path*` to the backend in `web/next.config.mjs`.

### Important public flow notes

- Homepage mixes CMS data and hardcoded UI/editorial content.
- Some public pages are fully CMS-backed.
- Some are still mostly hardcoded informational pages.

### Clearly hardcoded public content

- `web/src/app/page.tsx`
  - hardcoded “Institutional Identity” copy
  - hardcoded Knowledge Hub cards
- `web/src/components/home/quick-links.tsx`
  - hardcoded quick links
- `web/src/components/home/leaders-section.tsx`
  - hardcoded leader records
- `web/src/app/about/page.tsx`
  - hardcoded stats, commodities, and descriptive copy

## 6. Admin/CMS Flow

- Admin pages are protected by `ProtectedRoute` via `admin/src/app/(admin)/layout.tsx`.
- The admin app uses:
  - in-memory access token storage
  - refresh-token cookie
  - silent refresh through `admin/src/lib/api/client.ts`
- All admin data access goes through shared API helpers:
  - `admin/src/lib/api/http.ts`
  - `admin/src/constants/api-endpoints.ts`
- Generic CRUD UI patterns are heavily reused:
  - `admin/src/hooks/crud/*`
  - `admin/src/components/form/*`
  - `admin/src/components/data-table/*`
  - `admin/src/components/relationships/*`
- Feature folders in `admin/src/features/*` own module-specific pages, payload mapping, components, and API hooks.

### Admin form pattern

- Most forms use:
  - Zod schema in the feature/component layer
  - React Hook Form via `useZodForm`
  - payload mapper file such as `event-form-payload.ts`
- Important rule:
  - admin forms do not own lifecycle state transitions
  - publish/archive/restore happen through explicit lifecycle actions

## 7. Authentication and Roles

### Backend auth

- Auth routes live in `src/modules/auth/auth.routes.ts`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Access token:
  - Bearer token
- Refresh token:
  - cookie-based, rotated
- Auth middleware:
  - `src/middleware/authenticate.ts`
- Authorization middleware:
  - `src/middleware/authorize.ts`

### Roles

Defined in `src/modules/auth/auth.permissions.ts`:

- `super_admin`
- `content_editor`
- `publisher`

### Permission style

- Canonical format: `module.action`
- Examples:
  - `content.create`
  - `content.publish`
  - `dashboard.manage_data`
  - `masters.view`

### Behavior summary

- `super_admin`
  - wildcard/full access
- `content_editor`
  - create/update draft content
  - cannot publish/archive system-wide by default
- `publisher`
  - publish/unpublish/archive/restore
  - can edit where granted

### Not confirmed from current codebase

- Fine-grained editorial ownership restrictions beyond role/permission checks.

## 8. Database and Data Models

### ORM and migrations

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seeds: `prisma/seed/`
- Commands are wired in root `package.json`

### Major model groups

#### Identity / governance

- `User`
- `Role`
- `Permission`
- `RolePermission`
- `UserRole`
- `AuditLog`
- `Setting`

#### Media and reusable assets

- `MediaAsset`
- `MediaUsage`
- `Gallery`
- `GalleryImage`
- `Video`

#### Master/reference data

- `EventType`
- `TrainingType`
- `Commodity`
- `District`
- `Block`
- `InstitutionType`
- `DocumentType`
- `KnowledgeCategory`
- `CommunicationType`
- `TenderType`
- `ProcurementUpdateType`
- `FaqCategory`
- `EnquiryType`
- `FinancialYear`
- `ReportingPeriod`
- `Tag`

#### Content and relational modules

- `Document` plus junction tables
- `Event`
- `EventFieldDefinition`
- `EventNews`
- `ProgrammeScheme`
- `Toolkit`
- `ToolkitItem`
- `ToolkitDistributionSummary`
- `ToolkitDistributionItem`
- `Institution`
- `OfficialCommunication`
- `Tender`
- `ProcurementUpdate`
- `Page`
- `MenuItem`
- `Faq`
- `DigitalService`
- `InstitutionalMembership`
- `DashboardReport`
- `DashboardMetric`
- `DashboardDataset`
- `Enquiry`

### Important enums/status fields

- `PublicationState`
  - `draft`
  - `published`
  - `unpublished`
  - `archived`
- `HighlightType`
  - `new`
  - `latest`
  - `important`
  - `urgent`
  - `featured`
- `EventStatus`
  - `scheduled`
  - `ongoing`
  - `completed`
  - `postponed`
  - `cancelled`
- `MembershipLevel`
  - `sidhkofed`
  - `district_union`
- `MembershipType`
  - `primary`
  - `nominal`
- `MembershipStatus`
  - `active`
  - `inactive`

### Slug usage

- Slugs are used widely across master and content tables.
- Backend slug helpers:
  - `src/utils/slug.ts`
- Key rules:
  - server-generated on create
  - immutable after creation
  - uniqueness handled by `uniqueSlug`
  - admin-side slug utility is preview-only: `admin/src/utils/slug.ts`
- Public detail routes usually resolve by slug.
- Some filters and backend lookups accept either ID or slug.

### Soft delete / deactivation patterns

- Publishable content commonly uses:
  - `publicationState`
  - `publicVisibility`
  - `publishStartAt`
  - `publishedAt`
  - `archivedAt`
  - `showOnHomepage`
- “Archived” is the primary soft-removal pattern for content.
- Master/reference tables commonly use `isActive` instead of hard delete.
- Media also supports archival/replacement (`archivedAt`, `replacedById`).

### Search / indexing

- Several content tables use PostgreSQL `tsvector` search columns and GIN indexes.
- Search repository:
  - `src/modules/search/search.repository.ts`
- Search is database-backed, not external search-service based.

## 9. API and Data Fetching Patterns

### API structure

- Single immutable API base path:
  - `/api/v1`
- Namespaces:
  - `/auth`
  - `/admin`
  - `/public`
- Route registry:
  - `src/routes/index.ts`

### Backend module layering

- Standard shape per module:
  - `*.routes.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `*.repository.ts`
  - `*.validators.ts`
  - `*.dto.ts`
- Strong convention:
  - controller does HTTP only
  - service owns business rules
  - repository is the only Prisma caller

### Validation pattern

- Backend validation is Zod-based.
- Shared validation lives in:
  - `src/shared/validation.ts`
- Example module validator:
  - `src/modules/events/events.validators.ts`
- Strict schemas reject unknown fields.
- Server-managed fields like slug/state are intentionally not accepted from clients.

### Public data fetching pattern

- Server Components:
  - `web/src/lib/api/server.ts`
- Client interactions:
  - `web/src/lib/api/client.ts`
- Public pages should use `PUBLIC_ENDPOINTS` constants, not ad-hoc URLs.

### Admin data fetching pattern

- Shared admin endpoint builders:
  - `admin/src/constants/api-endpoints.ts`
- Shared HTTP helpers:
  - `admin/src/lib/api/http.ts`
- Generic list/detail/create/update/lifecycle via:
  - `admin/src/hooks/crud/*`

### Form handling pattern

- Admin:
  - React Hook Form
  - Zod
  - feature payload mapper
- Backend:
  - Zod parse + typed errors

### Server/client component usage

- `web/` uses App Router server-first rendering with selective client islands.
- `admin/` behaves more like a client-heavy CMS shell using App Router pages and client components.

## 10. UI and Design Conventions

### Shared design language

- Tailwind + semantic HSL CSS variables
- Avoid raw hex in components
- Primary visual identity is cooperative green with warm accent tones

### Main layout files

- Public:
  - `web/src/app/layout.tsx`
- Admin:
  - `admin/src/app/layout.tsx`
  - `admin/src/app/(admin)/layout.tsx`

### Styling files

- Public globals:
  - `web/src/app/globals.css`
- Admin globals:
  - `admin/src/app/globals.css`
- Tailwind configs:
  - `web/tailwind.config.ts`
  - `admin/tailwind.config.ts`

### Reusable component organization

- Public:
  - `web/src/components/layout/`
  - `web/src/components/cards/`
  - `web/src/components/content/`
  - `web/src/components/details/`
  - `web/src/components/dashboard/`
  - `web/src/components/listing/`
- Admin:
  - `admin/src/components/ui/`
  - `admin/src/components/form/`
  - `admin/src/components/navigation/`
  - `admin/src/components/data-table/`
  - `admin/src/components/relationships/`

### Responsive/accessibility patterns

- Focus-visible styles are global.
- Reduced motion is respected in both surfaces.
- Public site includes skip-link and text-size controls.
- Public site includes Hindi-capable typography.

### Existing design language to preserve

- Semantic token-based styling
- Tailwind utility conventions
- CMS tables/forms/layout reuse instead of bespoke screens
- Public site’s green/governance/institutional visual identity

## 11. Important Commands

### Root/backend

| Purpose | Command |
|---|---|
| Install | `npm install` |
| Dev API | `npm run dev` |
| Build API | `npm run build` |
| Start built API | `npm run start` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test` |
| Integration tests | `npm run test:integration` |
| Smoke test | `npm run smoke` |
| Prisma generate | `npm run prisma:generate` |
| Prisma migrate dev | `npm run prisma:migrate` |
| Prisma migrate deploy | `npm run prisma:deploy` |
| Prisma status | `npm run prisma:status` |
| Prisma studio | `npm run prisma:studio` |
| Seed | `npm run db:seed` |
| Bring up DB/Redis | `npm run db:up` |
| Tear down DB/Redis | `npm run db:down` |

### Admin frontend

| Purpose | Command |
|---|---|
| Install | `cd admin && npm install` |
| Dev | `cd admin && npm run dev` |
| Build | `cd admin && npm run build` |
| Start | `cd admin && npm run start` |
| Lint | `cd admin && npm run lint` |
| Typecheck | `cd admin && npm run typecheck` |
| Test | `cd admin && npm run test` |

### Public web frontend

| Purpose | Command |
|---|---|
| Install | `cd web && npm install` |
| Dev | `cd web && npm run dev` |
| Build | `cd web && npm run build` |
| Start | `cd web && npm run start` |
| Lint | `cd web && npm run lint` |
| Typecheck | `cd web && npm run typecheck` |
| Test | `cd web && npm run test` |

## 12. Coding Rules for Claude

- Treat the backend API as the system of record.
- Reuse existing vertical-slice module structure in `src/modules/`.
- Do not bypass service/repository layering.
- Do not add Prisma calls directly in controllers or random helpers.
- Reuse shared validation and workflow helpers before inventing new patterns.
- Preserve the immutable `/api/v1` contract unless a deliberate versioning decision is made.
- Use existing endpoint builders/constants in admin and web.
- Keep slugs server-generated and immutable after create.
- Keep publication lifecycle changes in explicit lifecycle endpoints/actions.
- Preserve bilingual field conventions:
  - English required where applicable
  - Hindi optional
- Reuse semantic design tokens; do not hardcode colors casually.
- Prefer existing CRUD/table/form abstractions in admin over new bespoke implementations.
- Keep public pages consuming `/public/*` endpoints only.
- Keep admin pages consuming `/admin/*` and `/auth/*` only.

## 13. Files Claude Should Be Careful With

### Highest-sensitivity files

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/routes/index.ts`
- `src/modules/auth/*`
- `src/middleware/authenticate.ts`
- `src/middleware/authorize.ts`
- `src/config/env.ts`
- `.env.example`
- `web/next.config.mjs`
- `admin/next.config.mjs`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Dockerfile`

### Why these are sensitive

- Schema and migrations affect persistent data and contracts.
- Auth/RBAC changes affect all protected routes.
- Route aggregation changes alter public/admin/auth surface area.
- Env/config changes can break local and deployed startup.
- Next rewrites are required for same-origin API behavior in both frontends.

## 14. Known Issues / Gaps / Risks

### Confirmed gaps

- Success Stories are not implemented in the backend schema/modules today.
  - Evidence:
    - no `SuccessStory` model in `prisma/schema.prisma`
    - `admin/src/app/(admin)/success-stories/page.tsx` is a placeholder
    - `web/src/app/activities/success-stories/page.tsx` is a placeholder page
    - `src/modules/home/home.service.ts` explicitly omits success stories
- Admin enquiries page is currently placeholder UI even though backend enquiry module exists.
  - Evidence:
    - `admin/src/app/(admin)/enquiries/page.tsx`

### Hardcoded-content risks

- Homepage is partly CMS-driven and partly hardcoded.
- About/leadership/quick-links content is still hardcoded in the web app.
- Claude should not assume all public content is editable via CMS.

### Documentation drift risks

- Some docs reference modules or flows that are planned but not fully implemented.
- `admin/package.json` description is stale relative to the actual admin surface.

### Technical debt visible from code/docs

- `src/modules/media/media.validation.ts` still has TODO markers for media optimization/thumbnail behavior.
- Public and admin routing surfaces are broad; careless endpoint or slug changes can cause regressions across both frontends.
- There are many content modules sharing lifecycle rules, so inconsistent edits can drift behavior across modules.

### Not confirmed from current codebase

- Full production deployment topology for how backend/admin/web are hosted together in the final environment.

## 15. Recommended Claude Workflow

### Read these first before making meaningful changes

1. `prisma/schema.prisma`
2. `src/routes/index.ts`
3. `src/modules/<target-module>/`
4. `src/shared/validation.ts`
5. `src/shared/publishing.ts`
6. `src/shared/visibility.ts`
7. `docs/foundation/06-development-rules.md`
8. For admin work:
   - `admin/src/constants/api-endpoints.ts`
   - `admin/src/hooks/crud/*`
   - relevant `admin/src/features/<module>/`
9. For public web work:
   - `web/src/lib/api/endpoints.ts`
   - `web/src/lib/api/server.ts`
   - relevant `web/src/app/...`

### Commands Claude should usually run after edits

- Backend-only changes:
  - `npm run typecheck`
  - `npm run test`
- Schema-related changes:
  - `npm run prisma:generate`
  - relevant migrate command if explicitly approved
- Admin changes:
  - `cd admin && npm run typecheck`
  - `cd admin && npm run test`
- Web changes:
  - `cd web && npm run typecheck`
  - `cd web && npm run test`
- Cross-surface behavior changes:
  - run the most relevant typechecks/tests for every touched surface
  - run `npm run smoke` if backend behavior is involved and environment is available

### When Claude should ask before changing

- Prisma schema or migrations
- Auth logic
- RBAC roles/permissions
- API route shape or endpoint names
- Slug rules
- Env/config files
- Next rewrites/CSP/security headers
- Shared lifecycle behavior used by multiple modules

### How Claude should summarize changes

- State which surface changed:
  - backend
  - admin
  - web
- Mention whether any contract/schema/auth changes occurred.
- Mention validation/tests/typechecks actually run.
- Call out any remaining unknowns or follow-up work clearly.

## 16. Quick Start for Future Claude Sessions

- This repo is a 3-surface system:
  - Express API at root
  - Next admin in `admin/`
  - Next public site in `web/`
- Start by identifying which surface the task belongs to.
- Do not assume a feature exists just because docs mention it.
- Verify implementation from:
  - `prisma/schema.prisma`
  - `src/routes/index.ts`
  - `src/modules/`
  - `admin/src/app/`
  - `web/src/app/`
- For content modules, expect a repeated pattern:
  - backend vertical slice
  - admin feature folder
  - optional public page(s)
- Treat slugs, publishing state, and RBAC as cross-cutting contracts.
- If touching the public website, check whether the target section is CMS-backed or still hardcoded first.
