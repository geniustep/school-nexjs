# Admin Phase 1 — Shell, School Switcher & Read-only Dashboard

**Project:** `d:\app\school-nexjs`  
**Scope:** Next.js only (no Odoo / Flutter changes)  
**Date:** 2026-06-03

---

## Summary

Admin-1 delivers a permission-aware admin shell: `/api/v1/me` RBAC fields, multi-school `active_school_id`, sidebar filtered by `permissions[]`, read-only list pages, and safe error states. Mutations (create/update/delete/import/export/print) are hidden via `isAdminReadOnlyPhase()`.

---

## Admin shell architecture

```
Login → BFF /api/auth/login → Odoo /me
     → httpOnly scc_session
Admin layout → requireRole('admin') → getCurrentUser() + normalizeMeUser + cookie school
     → PortalLayout → SessionProvider + AdminSessionProvider
     → AppShell (nav from permissions, SchoolSwitcher)
     → Pages → RequireAdminPermission + useAdminResource
     → /api/odoo/* proxy injects active_school_id on /admin/*
```

| Layer | Responsibility |
|--------|----------------|
| `normalize-user.ts` | Maps `school_ids`, `bindings`, `scopes[]`, legacy `school` / `scope` |
| `active-school.ts` | Cookie `scc_active_school`, validation against allowed schools |
| `nav-config.ts` | Sidebar items only if matching `view_*` permission |
| `use-admin-resource.ts` | Client queries append `active_school_id` |
| `RequireAdminPermission` | Page-level 403 UI + no active school state |
| `ApiErrorView` | Maps `forbidden` / `unauthenticated` without crash |

---

## `active_school_id` storage & transport

| Step | Mechanism |
|------|-----------|
| Resolve default | From `/me` (`active_school_id`, `school.id`, or sole `school_ids[0]`) |
| Persist choice | `POST /api/auth/active-school` → httpOnly cookie `scc_active_school` (7 days) |
| Client UI | `SchoolSwitcher` in topbar when `school_ids.length > 1` |
| Server fetch | `getCurrentUser()` / `serverGet` read cookie and set `user.active_school_id` |
| Browser API | BFF `/api/odoo/admin/*` adds query `active_school_id` from cookie |
| Client hook | `useAdminResource` merges `active_school_id` into list params |

Invalid school or backend 403 → `PermissionDeniedState` / `SchoolEmptyState` (no broad client fallback).

---

## Navigation ↔ permissions

| Permission | Nav item | Route |
|------------|----------|-------|
| `view_dashboard` | Dashboard | `/admin/dashboard` |
| `view_attendance` | Attendance | `/admin/attendance` |
| `view_students` | Students | `/admin/students` |
| `view_parents` | Parents | `/admin/parents` |
| `view_teachers` | Teachers | `/admin/teachers` |
| `view_classes` | Classes, Levels, Subjects | `/admin/classes`, `/admin/levels`, `/admin/subjects` |
| `view_homeworks` | Homework | `/admin/homeworks` |
| `view_resources` | Resources | `/admin/resources` |
| `view_timetable` | Timetable | `/admin/timetable` |
| `view_exams` | Exams | `/admin/exams` |
| `view_exam_results` | Exam results | `/admin/exam-results` |
| `view_channels` | Channels | `/admin/channels` |

Registry: `ADMIN_NAV_BY_PERMISSION` in `src/components/navigation/nav-config.ts`.

---

## Files added

| File | Purpose |
|------|---------|
| `src/lib/auth/normalize-user.ts` | `/me` normalization + compat |
| `src/lib/auth/active-school.ts` | Cookie read/write helpers |
| `src/lib/admin/phase.ts` | Read-only phase flag |
| `src/lib/permissions/admin-pages.ts` | Route → permission map |
| `src/lib/hooks/use-admin-resource.ts` | Admin fetch with school |
| `src/lib/api/channel-endpoints.ts` | Role-based channel paths |
| `src/features/auth/admin-session-context.tsx` | School switch state |
| `src/app/api/auth/active-school/route.ts` | Set school cookie |
| `src/components/admin/school-switcher.tsx` | Multi-school UI |
| `src/components/admin/require-admin-permission.tsx` | Page guard |
| `src/features/admin/dashboard/admin-readonly-dashboard.tsx` | KPI cards |

## Files updated (main)

- `src/types/user.ts`, `permissions.ts`
- `src/lib/config.ts`, `api/server.ts`, `endpoints.ts`
- `src/app/api/odoo/[...path]/route.ts`
- `src/components/navigation/nav-config.ts`, `layout/app-shell.tsx`, `portal-layout.tsx`
- `src/components/states/states.tsx`
- Admin list pages + `channels-list`, `channel-chat`, `admin-timetable-panel`
- Mutation UI: `admin-list-actions`, `confirm-action-button`, `export-button`, `csv-import-panel`, `admin-workflow-actions`
- `messages/{ar,en,fr,es}.json`
- `src/app/admin-workspace.css`

---

## QA expectations (manual — Odoo must be running)

| Account | Expected UI |
|---------|-------------|
| **qa.pm** | School switcher (9 & 10); lists change with school; only `/api/v1/admin/*`; nav per permissions |
| **qa.schoolmgr** | No switcher (or single school); school 10 data only |
| **qa.supervisor** | Nav subset per permissions; scoped data; forbidden outside scope |
| **qa.staff** | Typically Students (+ limited perms); no Parents/Teachers/Classes/… unless granted |
| **done** | Legacy super/school scope admin; dashboard + broad nav if permissions allow |
| **qa.teacher** | Redirect away from `/admin` to `/teacher/dashboard` |
| **qa.parent** | Redirect to `/parent/dashboard` |
| **qa.student** | Redirect to `/student/dashboard` |

Passwords: see `ODOO_BACKEND_SYNC.md` (QA table). RBAC QA accounts (`qa.pm`, etc.) use Odoo-defined passwords.

---

## Build / typecheck

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm run lint` | Not configured (Next.js prompts for ESLint setup) |

---

## Pages not fully permission-gated (legacy)

| Route | Note |
|-------|------|
| `/admin/academic` | Legacy hub; not in sidebar; no `RequireAdminPermission` |
| `/admin/*/[id]` detail + `/new` | Read-only mutations hidden; forms may still render on direct URL; no per-page permission wrapper yet |
| `/admin/students/new`, etc. | Routes exist; add/create blocked in UI only |

---

## API gaps (counts / pagination)

| Area | Note |
|------|------|
| Dashboard | Uses `/admin/dashboard` when `view_dashboard`; else list `meta.pagination.total` with `page_size=1` |
| Attendance today count | From dashboard payload or attendance summary |
| No dedicated count endpoints | Placeholder `—` if list fails without breaking page |
| Export/import | Disabled in UI (Admin-1); endpoints unchanged on backend |

---

## Security fixes in this phase

- Admin channels use **`/admin/channels`** (not public `/channels`).
- All admin data via **`/api/odoo/admin/*`** → `/api/v1/admin/*`.
- Wrong role cannot mount admin layout (`requireRole('admin')`).

---

## Ready for Admin-2?

**Yes, with caveats.**

- Shell, school switching, permission nav, read-only lists, and error states are in place.
- Admin-2 should: enable mutations per `manage_*` permissions, add detail-page guards, retire or gate `/admin/academic`, and wire print/import/export when allowed.

Set `isAdminReadOnlyPhase()` to `false` in `src/lib/admin/phase.ts` when starting Admin-2 actions.
