# SIDHKOFED CMS — Bug Log & Enhancement Tracker

**Project:** SIDHKOFED CMS & Public Portal  
**Version:** 1.0.0  
**Started:** 2026-06-27

---

## Status Key

| Status | Meaning |
|--------|---------|
| 🔴 Open | Reported, not yet investigated |
| 🟡 In Progress | Being actively worked on |
| 🟢 Fixed | Fix applied and verified |
| 🔵 Enhancement | Minor improvement (not a defect) |
| ⚪ Won't Fix | Accepted limitation or out of scope |
| 🟣 Deferred | Valid bug, scheduled for a future phase |

## Severity Key

| Severity | Meaning |
|----------|---------|
| Critical | System unusable / data loss / security breach |
| High | Feature broken, no workaround |
| Medium | Feature broken, workaround exists |
| Low | Visual, UX, or minor behavioural issue |
| Enhancement | No defect — quality-of-life improvement |

---

## Open / In Progress

| ID | Severity | Area | Title | Status | Assigned |
|----|----------|------|-------|--------|---------|
| — | — | — | *No open bugs* | — | — |

---

## Resolved

| ID | Severity | Area | Title | Status | Fixed In |
|----|----------|------|-------|--------|---------|
| BUG-001 | Critical | Admin CMS | Committed merge conflict markers in 46 source files | 🟢 Fixed | Phase 17.5 |

---

## Bug Detail Records

---

### BUG-001 — Committed merge conflict markers in 46 Admin CMS source files

| Field | Value |
|-------|-------|
| **ID** | BUG-001 |
| **Date reported** | 2026-06-27 |
| **Severity** | Critical |
| **Area** | Admin CMS (`admin/src/`) |
| **Status** | 🟢 Fixed |
| **Fixed in** | Phase 17.5 acceptance audit |

**Description:**  
46 files in the Admin CMS workspace contained unresolved git merge conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3`) that were committed to the repository. This caused `npx tsc --noEmit` to report 561 TypeScript errors and would have caused the Admin CMS Docker image build to fail in CI.

**Affected files (sample):**  
`admin/src/features/users/`, `admin/src/features/memberships/`, `admin/src/features/settings/`, `admin/src/features/masters/`, `admin/src/features/dashboard-data/`, and their corresponding `app/(admin)/` route files.

**Root cause:**  
A `git merge` was completed with conflict markers still present in the files. The `npm run typecheck` script (tsconfig-based via `next build` type checking) did not surface the errors; only direct `npx tsc --noEmit` revealed the full extent.

**Resolution applied:**  
1. All 46 files restored from `git show HEAD:<path>` to recover the original content with conflict markers intact.
2. CRLF line endings normalised (Windows `\r\n` → `\n`) before conflict parsing.
3. Conflicts resolved keeping the `d476bcebf` (theirs) side, which matched the supporting type files already in the codebase.
4. 12 residual TypeScript type mismatches (caused by renamed exports in the resolved version) patched individually:
   - `dashboard-data/index.ts` — added `DashboardDataPage` export
   - `dashboard-data/api.ts` — added backwards-compatible `DASHBOARD_DATA_PERMS`, `listDatasets`, `listMetrics`, `uploadDataset` exports
   - `dashboard-data/dashboard-data-page.tsx` — fixed `ReportingPeriodRef.label` → `.name_en`
   - `users/types.ts` — added `Language`, `User`, `UserCreateInput`, `UserUpdateInput` standalone types
   - `users/user-form-payload.test.ts` — fixed unsafe cast to `unknown as Record<string, unknown>`
   - `features/__tests__/admin-modules.routes.test.ts` — widened `Set` type to `Set<string>`

**Verification:**  
`npx tsc --noEmit` in `admin/` workspace: **0 errors**.  
`npm run lint` in `admin/` workspace: **0 errors**.

---

## Enhancement Log

| ID | Area | Title | Status |
|----|------|-------|--------|
| ENH-001 | Admin CMS — Sidebar | Collapsible sidebar navigation section groups | 🟢 Applied |
| ENH-002 | Public Website | JSLPS-inspired full frontend redesign | 🟢 Applied |

---

### ENH-001 — Collapsible sidebar navigation section groups

| Field | Value |
|-------|-------|
| **ID** | ENH-001 |
| **Date** | 2026-06-27 |
| **Area** | Admin CMS — `SidebarNav` |
| **Status** | 🟢 Applied |

**Request:**  
The sidebar showed all 8 section groups and their items at once. With 25+ nav items the list was long and hard to scan. Section headings should be clickable to collapse/expand their items.

**What was changed:**  
`admin/src/components/navigation/sidebar-nav.tsx` — single file change:
- Section labels (`<p>`) replaced with `<button>` elements carrying a `ChevronDown` icon that rotates -90° when collapsed.
- Added `useCollapsedSections()` hook that manages a `Set<string>` of collapsed section keys, persisted to `localStorage` under `sidhkofed:nav:collapsed-sections`.
- Items list wrapped in a CSS grid animated disclosure (`grid-rows-[0fr]` / `grid-rows-[1fr]`), giving a smooth height animation with no JS measurement.
- Three conditions prevent a section from collapsing: sidebar is in icon-only mode, the section has no label (Dashboard row), or the section contains the currently active page.
- `aria-expanded` attribute kept in sync for accessibility.

**Verification:**  
`npx tsc --noEmit` in `admin/` workspace: **0 errors**.

---

## How to log a new bug

Copy the template below and append it to this file.

```markdown
### BUG-XXX — Short title

| Field | Value |
|-------|-------|
| **ID** | BUG-XXX |
| **Date reported** | YYYY-MM-DD |
| **Severity** | Critical / High / Medium / Low / Enhancement |
| **Area** | Backend / Admin CMS / Public Website / DevOps / Docs |
| **Status** | 🔴 Open |
| **Fixed in** | — |

**Description:**  
What is wrong and what is the user-visible impact?

**Steps to reproduce:**  
1. ...
2. ...

**Expected behaviour:**  
...

**Actual behaviour:**  
...

**Root cause:**  
(Fill in after investigation)

**Proposed resolution:**  
...

**Resolution applied:**  
(Fill in after fix)

**Verification:**  
(Fill in after fix — how was it confirmed fixed?)
```
