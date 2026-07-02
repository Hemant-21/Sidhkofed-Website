# SIDHKOFED CMS — Admin Frontend Foundation (Phase 15.0)

> Reusable frontend **infrastructure only**. No module pages, no CRUD, no
> business UI. Every later module is built by *composing* what is here — it should
> never re-implement layout, auth, the API client, tables, forms, or dialogs.
>
> Source-of-truth precedence (frozen): `docs/sidhkofed-cms-codex-context.md` →
> `docs/database-schema-design.md` → `docs/api-specification.md` →
> `docs/claude-master-build-context.md` → `docs/foundation/*`. This app **consumes**
> those contracts; it never redesigns workflows, endpoints, or permissions.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · TailwindCSS · TanStack Query ·
React Hook Form · Zod · Axios · Lucide. No frameworks were added beyond the
mandated set.

```bash
npm install
npm run dev        # http://localhost:3001
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm test           # vitest
npm run build      # production build
```

`NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`) points at the backend. The browser
holds **no secrets** — only `NEXT_PUBLIC_*` values exist client-side.

## 1. Folder structure (feature-based, not app/-only)

```text
admin/src/
├── app/                    # routes only (App Router)
│   ├── (admin)/            # authenticated segment → ProtectedRoute + AdminShell
│   │   ├── dashboard/      # placeholder landing (NOT the Dashboard module)
│   │   ├── layout.tsx  loading.tsx
│   ├── (auth)/login/       # guest login route
│   ├── 403/  server-error/ # addressable status pages (see §9)
│   ├── error.tsx  global-error.tsx  not-found.tsx  loading.tsx  layout.tsx  page.tsx
│   └── globals.css
├── components/
│   ├── ui/                 # design system (~35 generic components)
│   ├── layout/             # PageContainer, ContentWrapper, PageHeader, Card, Toolbar…
│   ├── navigation/         # AdminShell, Sidebar, Topbar, MobileDrawer, UserMenu…
│   ├── data-table/         # generic server-driven DataTable
│   ├── form/               # RHF+Zod form system (fields, sections, bilingual tabs, draft)
│   ├── feedback/           # Empty/Error/Forbidden states, loaders, ErrorBoundary, skeletons
│   └── auth/               # <Can>, <ProtectedRoute>
├── providers/              # Theme · Query · Toast · Auth · Dialog · Loading (composed once)
├── hooks/                  # useAuth, usePermissions, usePagination, useDebounce, useToast…
├── lib/                    # api/ (axios client, http helpers, errors, token-store, crud-factory), query, validation
├── services/               # auth.service (calls lib/api; module data services live here later)
├── config/                 # env, navigation (sidebar config = data, not markup)
├── constants/              # routes, permissions, query-keys, api-endpoints, status, app
├── types/                  # api, auth, common, form, table
├── utils/                  # cn, date, format, pagination, permission, query-string, slug, browser
└── features/               # feature slices (auth/login-form); future modules land here
```

## 2. Architecture overview

```text
Component → hook (useAuth/usePermissions/…) ─┐
                                             ├─► services/*  ─► lib/api/http ─► lib/api/client (axios)
TanStack Query (useQuery/useMutation) ───────┘                                   │ interceptors
                                                                                 ├─ request: attach Bearer (in-memory)
                                                                                 ├─ response: single-flight 401→/auth/refresh→replay
                                                                                 └─ normalizeError → ApiError (typed)
```

- **One axios instance** (`lib/api/client.ts`). Nothing else does raw fetch/axios.
- **Envelope unwrapping** in `lib/api/http.ts`: callers get `data` /
  `{items, pagination}` directly (API spec §1.4).
- **Providers** mounted once in `providers/app-providers.tsx`, order:
  Theme → Query → Toast → Auth → Dialog → Loading. Providers only — no business logic.

## 3. Authentication

- Login / refresh / logout / `auth/me` via `services/auth.service.ts` (API spec §2).
- **Access token in memory only** (`lib/api/token-store.ts`) — never
  localStorage/sessionStorage. **Refresh token is the backend's Secure/HttpOnly
  cookie** (`withCredentials`). Session is **restored on boot** with one silent
  `/auth/refresh`.
- 401 → single de-duplicated refresh, then queued requests replay; terminal failure
  emits `unauthorized` → AuthProvider clears session and routes to `/login?next=…`.
- `(admin)/layout.tsx` wraps everything in `<ProtectedRoute>`; `/login` is guest-only.

## 4. Authorization

- **Backend is the only source of truth.** The frontend defines **no** authority —
  it reads the flat `permissions`/`roles` arrays on `AuthUser` (codex §7).
- `usePermissions()` → `can / canAll / canAny / hasRole`; `<Can permission="events.publish">`
  for declarative rendering; `useCan('…')` for a single check.
- Super Admin handled via the `*` wildcard. `constants/permissions.ts` only *builds*
  `module.action` keys (e.g. `modulePermissions('events').publish`) — it grants nothing.
- Sidebar visibility is permission/role-aware (affordance only — the API re-checks every action).

## 5. API layer

`lib/api/` provides typed `get / getList / post / patch / put / del`, `uploadFile`,
`uploadFiles`, `getBlob`, plus `crud-factory` for module resource clients. Errors are
normalized to `ApiError` with `.code`, `.status`, `.fields`, `.isClientError`
covering 400/401/403/404/409/422/429/500 and network/timeout. Query strings via
`utils/query-string` (`normalizeListQuery` + `withQuery`).

## 6. React Query

`providers/query-provider.tsx`: one shared client; `staleTime 30s`, `gcTime 5m`,
no refetch-on-focus, **no retry on 4xx** (`ApiError.isClientError`), mutations
no-retry. Global query keys in `constants/query-keys.ts`; invalidate/prefetch
helpers in `lib/query.ts`. Devtools in dev only.

## 7. Reusable systems

- **DataTable** (`components/data-table`): server pagination/sort/filter, column
  visibility, bulk selection, action column, loading/empty/error states, responsive.
- **Forms** (`components/form`): RHF + Zod, server-validation mapping to inline
  errors, section layout, **bilingual tabs** (`*_en`/`*_hi`), draft persistence,
  generic field components — no business fields.
- **Dialogs** (`providers/dialog-provider` + `hooks/use-confirm-dialog`): imperative
  `await confirm({…})` with delete/archive/restore/publish/unpublish presets.
- **Toasts** (`providers/toast-provider` + `useToast`): success/error/info/warning + promise.

## 8. Theme

Light/dark with `system` follow, persisted preference, `dark` class toggling
CSS-variable tokens (`globals.css`). Frontend display preference only.

## 9. Routing & error handling

- Route groups: `(admin)` (protected) and `(auth)` (guest).
- 404 → `app/not-found.tsx`; 403 → `/403` route + ForbiddenState; runtime/server
  errors → `app/error.tsx` (segment) and `app/global-error.tsx` (root).
- **`/500` is intentionally avoided** — that App Router segment collides with Next's
  generated `500.html` at build time on Windows. The addressable 500 status page is
  `/server-error` (`ROUTES.serverError`); reverse proxies should map `error_page 500`
  there.
- Suspense/loading via `loading.tsx`; reserved module routes in `constants/routes.ts`.

## 10. Testing summary

Vitest + Testing Library, **21 tests / 5 files** green: permission helpers, pagination,
API error normalization, `<Can>` authorization rendering, Button (variants/a11y/click).
Run `npm test`. Units are colocated (`*.test.ts(x)`).

## 11. Accessibility summary (WCAG AA intent)

Semantic landmarks + skip-link in AdminShell; focusable `<main>`; real `<button>`s;
labelled fields with `aria-invalid` + `aria-describedby` linkage (`form-field.tsx`);
accessible Dialog (focus trap via `use-focus-trap`, Escape, labelled); ARIA-correct
Dropdown (`menu`/`menuitem`), MultiSelect (`combobox`+`listbox`/`option` with
`aria-controls`), Tabs, Switch; status not conveyed by color alone; `aria-current`
on active nav.

## 12. Performance summary

App Router server components by default; `'use client'` only where needed; Query
caching + dedupe; no-retry on 4xx; `next/font` (Inter) with `display:swap`; Devtools
dev-only; lean shared bundle (~87 kB First Load JS); icons tree-shaken from lucide.

## 13. Architecture compliance report

| Contract | Status |
|---|---|
| Stack reused (Next/TS/Tailwind/Query/RHF/Zod/Axios/Lucide), nothing extra | ✅ |
| Feature-based folders, not everything in `app/` | ✅ |
| Single `/api/v1` base; one envelope unwrapped centrally | ✅ |
| `snake_case` API fields preserved in `types/*` | ✅ |
| Access token in memory; refresh = HttpOnly cookie; boot restore | ✅ |
| Authorization 100% backend-driven; no FE permission definitions | ✅ |
| Lifecycle verbs match backend (`publish/unpublish/archive/restore`) | ✅ |
| No module pages / CRUD / business components | ✅ |
| Reusable DataTable / Form / Dialog / Toast systems | ✅ |
| Bilingual (`*_en`/`*_hi`) tabs in the form system | ✅ |
| Error handling for 401/403/404/409/422/500 + network/timeout/offline | ✅ |
| Typecheck / lint / tests / production build all green | ✅ |

## 14. Final self-audit

✔ No backend modifications · ✔ No module pages · ✔ No CRUD · ✔ Shared
infrastructure only · ✔ Responsive shell (desktop/tablet/mobile + collapse +
drawer) · ✔ Auth complete · ✔ Authorization complete · ✔ API layer complete ·
✔ React Query configured · ✔ Components/dialogs/tables/forms reusable ·
✔ Accessibility implemented · ✔ Performance-conscious · ✔ No duplicated logic ·
✔ Future modules need minimal boilerplate (add a folder under `(admin)/`, a nav
entry, a service + query keys; reuse everything else).

> **Phase 15.0 stops here.** Do not begin module/CRUD work (Phase 15.1+) — those
> compose this foundation.
