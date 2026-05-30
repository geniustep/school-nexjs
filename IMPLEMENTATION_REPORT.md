# Smart School Connect — Next.js Web Platform: Implementation Report

**Date:** 2026-05-30
**Agent:** Next.js Agent
**Source of truth:** `API_REPORT.md` (frozen Odoo API v1.2)
**Branch:** `claude/sharp-franklin-VLNRz`

---

## 1. Summary

A complete MVP web platform serving all four roles (Admin, Teacher, Parent,
Student) from one Next.js App Router codebase, built strictly against the frozen
API v1 contract. Authentication uses Odoo session cookies via a
Backend-for-Frontend (BFF) proxy so the session stays httpOnly and server-side.
Navigation and pages are permission- and scope-aware; all data views handle
loading / empty / error / permission-denied / session-expired states.

`npm run typecheck` and `npm run build` both pass (25 routes compiled).

**Explicitly excluded:** weekly scoring (no pages, calls, or nav). No Odoo
terminology is shown to users.

---

## 2. Files added

**Config:** `package.json`, `tsconfig.json`, `next.config.mjs`, `next-env.d.ts`,
`.gitignore`, `.env.example`, `README.md`, `IMPLEMENTATION_REPORT.md`

**Types (`src/types/`):** `api.ts`, `user.ts`, `permissions.ts`, `scope.ts`,
`student.ts`, `parent.ts`, `teacher.ts`, `class.ts`, `attendance.ts`,
`channel.ts`, `message.ts`, `dashboard.ts`, `index.ts`

**Lib (`src/lib/`):** `config.ts`, `api/endpoints.ts`, `api/odoo-server.ts`,
`api/server.ts`, `api/client.ts`, `auth/session.ts`, `auth/guards.ts`,
`permissions/permissions.ts`, `permissions/scope.ts`, `routes/role-routes.ts`,
`hooks/use-resource.ts`, `utils/cn.ts`, `utils/labels.ts`, `utils/format.ts`

**Components (`src/components/`):** `layout/app-shell.tsx`,
`layout/portal-layout.tsx`, `navigation/nav-config.ts`, `ui/primitives.tsx`,
`ui/toast.tsx`, `tables/data-table.tsx`, `states/states.tsx`,
`states/resource.tsx`, `badges/attendance-badge.tsx`

**Features (`src/features/`):** `auth/session-context.tsx`, `auth/login-form.tsx`,
`channels/channels-list.tsx`, `channels/channel-chat.tsx`,
`attendance/attendance-batch.tsx`, `announcements/announcements-feed.tsx`,
`parent/child-subnav.tsx`

**App routes (`src/app/`):** root `layout.tsx`, `page.tsx`, `globals.css`,
`login/page.tsx`, BFF routes, and all role pages (see §3).

---

## 3. Routes implemented (25)

**Auth / root:** `/` (role redirect), `/login`

**BFF API:** `/api/auth/login`, `/api/auth/logout`, `/api/odoo/[...path]`

**Admin:** `/admin/dashboard`, `/admin/students`, `/admin/students/[id]`,
`/admin/parents`, `/admin/parents/[id]`, `/admin/teachers`,
`/admin/teachers/[id]`, `/admin/levels`, `/admin/classes`, `/admin/subjects`,
`/admin/attendance`, `/admin/channels`, `/admin/channels/[id]`

**Teacher:** `/teacher/dashboard`, `/teacher/classes`, `/teacher/classes/[id]`,
`/teacher/attendance`, `/teacher/channels`, `/teacher/channels/[id]`

**Parent:** `/parent/dashboard`, `/parent/children`, `/parent/children/[id]`,
`/parent/children/[id]/student-view`, `/parent/children/[id]/attendance`,
`/parent/children/[id]/channels`, `/parent/children/[id]/announcements`,
`/parent/channels`, `/parent/channels/[id]`

**Student:** `/student/dashboard`, `/student/profile`, `/student/attendance`,
`/student/channels`, `/student/channels/[id]`, `/student/announcements`

---

## 4. API endpoints consumed (all from API_REPORT.md §3)

- **Auth:** `POST /web/session/authenticate`, `POST /api/v1/auth/logout`,
  `GET /api/v1/me`
- **Admin:** `/admin/dashboard`, `/admin/students`, `/admin/students/{id}`,
  `/admin/parents`, `/admin/teachers`, `/admin/levels`, `/admin/classes`,
  `/admin/subjects`, `/admin/attendance`
- **Teacher:** `/teacher/dashboard`, `/teacher/classes`,
  `/teacher/classes/{id}/students`, `/teacher/classes/{id}/attendance/today`,
  `POST /teacher/classes/{id}/attendance/batch`
- **Parent:** `/parent/dashboard`, `/parent/children`,
  `/parent/children/{id}`, `/parent/children/{id}/attendance`,
  `/parent/children/{id}/student-view`, `/parent/children/{id}/channels`,
  `/parent/children/{id}/announcements`
- **Student:** `/student/dashboard`, `/student/profile`, `/student/attendance`
- **Channels:** `/channels`, `/channels/{id}`, `/channels/{id}/messages` (GET),
  `POST /channels/{id}/messages`

Not consumed in this MVP: `POST /api/v1/auth/login` (the report recommends
`/web/session/authenticate` first — we use that), `POST /api/v1/auth/refresh`
(session is validated via `/me`), `POST /api/v1/admin/import/students`
(see §10).

---

## 5. Auth / session behavior

- Login posts to the BFF, which calls `/web/session/authenticate`, captures the
  Odoo `session_id`, stores it in an httpOnly cookie (`scc_session`), then calls
  `/api/v1/me` and returns the user.
- After login the user is redirected by role: admin→`/admin/dashboard`,
  teacher→`/teacher/dashboard`, parent→`/parent/dashboard`,
  student→`/student/dashboard`.
- Each role layout is a server component that calls `requireRole()`:
  unauthenticated → redirect to `/login`; wrong role → redirect to that user's
  own home (no cross-portal leakage).
- Expired/invalid session: any API call returning `unauthenticated` triggers the
  SessionExpired state, which clears the cookie and redirects to
  `/login?expired=1`.
- Logout clears both the Odoo session and the local cookie.

---

## 6. Role-based navigation behavior

`src/components/navigation/nav-config.ts` builds the sidebar per role, filtered
by `user.permissions` and admin scope. Inaccessible sections are not rendered.
The shell shows the school name and a role subtitle (e.g. "Administrator ·
Limited access").

---

## 7. Admin scope behavior (API_REPORT.md §4)

Derived entirely from `/api/v1/me` (never hardcoded):

- **Super admin** (`is_super_admin` or `scope.type==='school'`): full nav + data.
- **Scoped admin** (`levels`/`classes`/`level_group`/`custom`): school sections
  shown, but the server enforces scope; a "Limited access" badge is displayed.
- **`channels` scope:** only the Communication section appears (no student/
  attendance/class data).
- **Unconfigured admin** (no scope, not super): navigation collapses to the
  dashboard, which renders an access-restricted state and links to no data. The
  dashboard endpoint is not even called.

Out-of-scope record requests surface as the server's `not_found` /
`permission_denied`, rendered as the corresponding state.

---

## 8. Parent child student-view behavior (API_REPORT.md §5)

- `/parent/children/[id]/student-view` renders a **read-only** view from
  `/parent/children/{id}/student-view`: profile, attendance summary, recent
  attendance, channels, announcements.
- The parent stays authenticated as a parent — there is **no composer** anywhere
  in any child view. Child channels always display as read-only (`can_send` is
  always false per contract).
- A child sub-nav (Overview / Student view / Attendance / Channels /
  Announcements) ties the read-only views together.
- Accessing a non-linked child surfaces `permission_denied`; a non-existent
  child surfaces `not_found` — both rendered as their respective states.

---

## 9. Tests performed

- `npm run typecheck` — passes (strict TS, 0 errors).
- `npm run build` — passes; all 25 routes compile; correct server/client
  component boundaries; no prerender errors.

Mapping to the mandatory scenarios (logic verified in code; live API runs
pending — see §12):

| # | Scenario | How it is satisfied |
|---|----------|---------------------|
| 1 | Admin login + `/me` | BFF login → `/me`, role redirect |
| 2 | Super admin full scope | `isSuperAdmin` → full nav/data |
| 3 | Scoped admin limited | nav filtered by scope; "Limited access" badge |
| 4 | Scoped admin blocked outside scope | server `not_found`/`permission_denied` → states |
| 5 | Admin without scope sees nothing | dashboard blocked state; no data calls |
| 6 | Teacher sees assigned classes only | `/teacher/classes` only |
| 7 | Teacher unassigned class blocked | `permission_denied` → ApiErrorView |
| 8 | Teacher attendance assigned only | batch endpoint per class; server-enforced |
| 9 | Parent linked children only | `/parent/children` only |
| 10 | Parent cannot open another child | `permission_denied` state |
| 11 | Child student-view read-only | no composer/write anywhere |
| 12 | Child channels `can_send=false` | read-only badges, no composer |
| 13 | Student own data only | `/student/*` self endpoints |
| 14 | Student cannot access others | no cross-student routes/calls |
| 15 | Channels respect `can_send` | composer gated on `can_send` |
| 16 | No weekly scoring | absent everywhere |
| 17 | Unauthenticated → login | `requireRole` redirect + session-expired flow |

---

## 10. Known limitations

1. **No dedicated detail endpoints for parents/teachers/classes** in API v1
   (only list endpoints). Parent and teacher detail pages locate the record
   within the list payload (`page_size=200`). If a record is beyond that window
   it shows "not found". A detail endpoint in v2 would remove this workaround.
2. **Student announcements page** reuses the announcements array from
   `/student/dashboard` (no standalone student-announcements endpoint exists).
3. **Admin import students** (`POST /admin/import/students`) is documented but no
   import UI was built in this MVP (read-first focus). Easy to add later.
4. **Attendance batch date:** the teacher roster is loaded from
   `/attendance/today`; submitting for a non-today date is allowed (upsert) but
   existing records for other dates are not pre-loaded (no per-date teacher GET
   in the contract).
5. **`auth/refresh`** is not used; session validity is checked via `/me`.
6. Labels are English-only for v1; the structure is RTL- and i18n-ready
   (logical CSS properties, centralized label maps) for Arabic/French later.

---

## 11. Missing endpoints / mock adapters

**No mock adapters were created.** Every consumed path exists in the frozen
contract. The only contract gaps encountered (parent/teacher/class detail,
standalone student announcements) were handled by reusing documented list/
dashboard endpoints rather than inventing new ones — see §10.

---

## 12. Next QA steps

1. Point `ODOO_BASE_URL`/`ODOO_DB` at a live API v1 instance and run the
   mandatory scenarios end-to-end with the provided test users
   (`done`/`admin123` super admin, `qa.student`/`student123`).
2. Configure a scoped admin (`school.admin.scope`) and verify nav/data
   restriction and the unconfigured-admin blocked state.
3. Verify `can_send=false` channels never render a composer and that sending in
   a read-only channel surfaces the permission-denied toast.
4. Confirm teacher batch attendance partial-success handling against a payload
   containing an invalid student id.
5. Confirm session expiry handling by invalidating the Odoo session mid-use.
6. Accessibility/RTL smoke test by switching `<html dir>` to `rtl`.
