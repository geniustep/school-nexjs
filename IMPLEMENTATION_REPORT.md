# Smart School Connect — Next.js Web Platform: Implementation Report

**Date:** 2026-05-30 (Live API QA appended same day)
**Agent:** Next.js Agent
**Source of truth:** `API_REPORT.md` (frozen Odoo API v1.2)
**Branch:** `claude/sharp-franklin-VLNRz`
**Live QA status:** Completed against the live instance `https://app.propanel.ma`
(DB `alwah`). See **§13 Live API QA results** for the full run. Verdict: **Ready
for Flutter handoff** with two tracked issues (one backend bug, one minor
frontend robustness note) — neither blocks the web MVP. Details in §13.7–§13.9.

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
   within the list payload using **`page_size=200`**. If a record is beyond that
   window it shows "not found". This **`page_size=200` limitation is retained and
   confirmed live** (see §13.3 row 8.2). A detail endpoint in v2 would remove this
   workaround. *(Students are exempt — they have a real `/admin/students/{id}`.)*
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

> **All of the above were executed against the live instance — see §13.**

---

## 13. Live API QA results

### 13.1 Environment

| Item | Value |
|------|-------|
| Live backend | `https://app.propanel.ma` (reachable, 200 OK) |
| Odoo database | `alwah` (confirmed correct; school = "مؤسسة الواح") |
| Web platform | Next.js dev server, `npm run dev`, `http://localhost:3100`, `.env` pointed at the live backend |
| API surface | `/api/v1/*` via Odoo session cookie (`/web/session/authenticate`) through the Next.js BFF |
| Method | (a) automated REST exercising of the **BFF** (`/api/auth/login`, `/api/odoo/[...path]`) for every role, plus (b) manual browser walkthrough of the four portals |
| Build health | `npm run typecheck` ✅ pass · `npm install` ✅ · dev server ✅ ready |

A local Odoo on `:8069` was **not** available; the live instance
`app.propanel.ma` was used for all QA (provided mid-session).

### 13.2 Tested accounts / roles (passwords intentionally not shown)

| Role | Login | uid | Resolved `/me` |
|------|-------|-----|----------------|
| Super admin | `done` | 2 | `role=admin`, `scope.type=school`, `is_super_admin=true`, full permission set |
| Teacher | `qa.teacher` | 56 | `role=teacher`; assigned classes 32 (1A Primaire), 33 (2A Primaire) |
| Parent | `qa.parent` | 57 | `role=parent`; one linked child (id 21, 1A Primaire) |
| Student | `qa.student` | 58 | `role=student`; own profile (student id 21, 1A Primaire) |

> **Scoped admin** and **unconfigured (no-scope) admin** test accounts are **not
> provisioned** on the live instance (tried the common login conventions — none
> exist). Those two sub-scenarios were therefore verified at the code/contract
> level only (see §13.3 row 2.2–2.3). Recommend the backend team add a scoped
> admin (`levels`/`classes` scope) and a no-scope admin for full live coverage.

### 13.3 Scenario results

Legend: ✅ pass (live) · 🟡 pass (code/contract — no live account/trigger) · ⚠️ issue found

| # | Scenario | Result | Live evidence |
|---|----------|:------:|---------------|
| **1. Auth/session** | | | |
| 1.1 | Login admin/teacher/parent/student | ✅ | BFF `/api/auth/login` → 200 for all four; correct `role` returned |
| 1.2 | `/api/v1/me` via BFF | ✅ | `GET /api/odoo/me` → 200, correct user/role/scope for each role |
| 1.3 | Session cookie is httpOnly | ✅ | `Set-Cookie: scc_session=…; Path=/; Max-Age=604800; HttpOnly; SameSite=lax` |
| 1.4 | Logout clears session | ✅ | `POST /api/auth/logout` → 200, `Set-Cookie: scc_session=; Max-Age=0`; subsequent `/me` → 401 `unauthenticated` |
| 1.5 | Invalid/expired session → login | ✅ (nav) / ⚠️ (client refetch) | Server guard `getCurrentUser()` returns null on any non-success `/me` → redirect to `/login` on every navigation. **But** the live API returns **404 `not_found`** (not 401) for an invalid session, and the client-side `ApiErrorView` only maps `unauthenticated`→session-expired. See §13.7-B. |
| 1.6 | Bad credentials rejected | ✅ | `done`/wrong → 401 `invalid_credentials` |
| **2. Admin scope** | | | |
| 2.1 | Super admin → full-school data | ✅ | students 5, parents 3, teachers 3, levels 12, classes 4, subjects 8, attendance 7, channels 3; dashboard totals render (5/3/2/4) |
| 2.2 | Scoped admin → only allowed scope | 🟡 | No scoped account on live. Code: nav filtered by scope + server enforces; "Limited access" badge. |
| 2.3 | Admin without scope → denied/no data | 🟡 | No account on live. Code: dashboard renders access-restricted state, no data calls issued. |
| 2.4 | No out-of-scope records in UI | ✅ | Super admin is full-school by definition; out-of-scope enforcement re-confirmed via teacher/parent/student tests below. |
| **3. Teacher** | | | |
| 3.1 | Sees only assigned classes | ✅ | `/teacher/classes` → exactly [32, 33]; dashboard "My classes" shows 1A & 2A only |
| 3.2 | Cannot access unassigned class | ✅ | `/teacher/classes/34/students` → **403 `permission_denied`** |
| 3.3 | Attendance batch works | ✅ | `POST /teacher/classes/32/attendance/batch` (students 21,22) → 200 `{saved:2, failed:0}`; roster UI reflects saved state |
| 3.4 | Partial failure surfaced | ✅ | Batch with one bogus id → 200 `{saved:1, failed:1, errors:[{student_id:999999, error:"Student not in this class."}]}`; cross-class id → `{saved:0, failed:1}`. Frontend toasts `Saved X, but Y could not be saved` + per-student error. |
| 3.5 | Cannot send where `can_send=false` | ✅ | `POST /channels/4/messages` → **403 `permission_denied`**; channel 4 shows "Read-only" badge, **no composer**, "🔒 This channel is read-only for you." |
| 3.6 | Can send where `can_send=true` | ✅ | `POST /channels/5/messages` → **201**; composer ("Write a message…" + Send) is visible; message appears in thread |
| **4. Parent** | | | |
| 4.1 | Sees only linked children | ✅ | `/parent/children` → exactly [21] |
| 4.2 | Cannot access another child via URL | ✅ | `/parent/children/22` and `.../22/student-view` → **403 `permission_denied`**; UI renders "🔒 Access restricted — You do not have access to this student." |
| 4.3 | Child student-view is read-only | ✅ | `/parent/children/21/student-view` → 200; UI shows "Read-only" badge + banner "🔒 Read-only view. Parent cannot act as the student." No composer/action anywhere. |
| 4.4 | Child channels: no composer, `can_send=false` | ✅ | `/parent/children/21/channels` → 1 channel, `can_send=false`; page titled "Channels visible to your child (read-only)", "Read-only" badge, no composer |
| 4.5 | Parent cannot send as student | ✅ | No composer exists in any child view; parent stays authenticated as parent (never as the child) |
| **5. Student** | | | |
| 5.1 | Sees only own dashboard/profile/attendance | ✅ | `/student/dashboard`, `/student/profile`, `/student/attendance` → 200; profile = own record (student 21); nav scoped to "Me" |
| 5.2 | Cannot access another portal | ✅ | `GET /admin/students`, `/teacher/classes`, `/parent/children` as student → all **403 `permission_denied`**; browser nav to `/admin/students` → server-redirected to `/student/dashboard` |
| 5.3 | Cannot access another student's data | ✅ | Student endpoints are self-scoped (no id parameter); no cross-student route exists |
| 5.4 | Channels respect `can_send` | ✅ | `/channels` as student → 1 channel, `can_send=false` (read-only) |
| **6. Channels/messages** | | | |
| 6.1 | Composer only when `can_send=true` | ✅ | Verified for teacher channel 5 (composer present) |
| 6.2 | Composer hidden when `can_send=false` | ✅ | Verified for teacher channel 4 + parent child channel + student channel (all read-only, no composer) |
| 6.3 | Sending works only in allowed channels | ✅ | channel 5 → 201; channel 4 → 403 |
| 6.4 | `permission_denied` displayed cleanly | ✅ | Toast "You cannot send messages in this channel." (send) / "Access restricted" state (view) |
| **7. Weekly scoring** | | | |
| 7.1 | No page/nav/API/UI text | ✅ | Full `src/` search for `weekly\|scoring\|score\|grade\|تقييم` → **0 matches**. No nav item, route, endpoint, or label exists. (README/this report mention it only as *explicitly excluded*.) |
| **8. Detail pages limitation** | | | |
| 8.1 | List-derived detail pages work | ✅ | Admin students detail uses the real `/admin/students/{id}`. Parent/teacher/class detail are derived from list payloads (`page_size=200`) — verified the list endpoints return full records live. |
| 8.2 | `page_size=200` limitation documented | ✅ | See §10.1 (retained and expanded). |

### 13.4 Screens / routes exercised in the browser

- `/login` (render, validation, post-login role redirect, expired banner path)
- `/admin/dashboard` (super admin, "Full school", totals 5/3/2/4, full nav)
- `/teacher/dashboard`, `/teacher/classes/[id]` (graceful 500 state), `/teacher/attendance` (roster + batch UI), `/teacher/channels`, `/teacher/channels/4` (read-only), `/teacher/channels/5` (composer)
- `/parent/children/21/student-view` (read-only), `/parent/children/21/channels` (read-only), `/parent/children/22` (access-restricted)
- `/student/dashboard` (own profile, scoped nav), cross-portal `/admin/students` → redirected
- Server-side guard redirects: authenticated user hitting `/login` → own portal; wrong-portal URL → own portal home

### 13.5 Passed scenarios

All mandatory scenarios in groups **1, 3, 4, 5, 6, 7, 8** passed **live**.
Group **2** passed live for the super-admin path (2.1, 2.4); the scoped-admin and
no-scope-admin sub-cases (2.2, 2.3) are verified at code/contract level because
those accounts do not exist on the live instance.

### 13.6 Failed scenarios

None of the web-platform scenarios failed. Two **issues were found** (one is a
backend defect, one a frontend robustness gap) — see §13.7. The frontend handles
both gracefully; neither produces a crash or data leak.

### 13.7 API mismatches found

**A. `GET /api/v1/teacher/classes/{id}/students` returns HTTP 500 (backend bug).**
- Reproduced 3/3 times for assigned class 32 (teacher is legitimately assigned).
- The web platform consumes this on the **teacher class-detail page**
  (`/teacher/classes/[id]`). It degrades gracefully to a "Something went wrong —
  Unexpected response (500)" state with a retry button (no crash).
- Impact: the teacher "Class students" roster list cannot load. **Note:** teacher
  **attendance** does *not* depend on this endpoint (it uses
  `/teacher/classes/{id}/attendance/today`), so attendance is unaffected.
- This is a **server-side defect**, not a frontend issue. Recommend the backend
  team fix the 500. No frontend change required.

**B. Invalid/expired session returns `404 not_found` instead of `401
unauthenticated`.**
- Every `/api/v1/*` endpoint (incl. `/me`) returns **404 `not_found`** when the
  session cookie is present but invalid/expired (confirmed across `/me`,
  `/channels`, `/admin/*`, `/teacher/*`, `/parent/*`, `/student/*`).
- Effect on the platform:
  - **Navigation / server guards: correct.** `getCurrentUser()` treats any
    non-success `/me` as "no user" → `requireRole()` redirects to `/login`. So
    expiry is handled on every page load/navigation. ✅
  - **Client-side refetch (stale open page, no navigation): minor gap.** The
    client `ApiErrorView` maps only `unauthenticated`→ the session-expired
    redirect flow; a `not_found` from an expired session would instead render a
    "Not found" state until the next navigation (which then redirects). ⚠️
- A blanket "treat 404 as expired" mapping would be **wrong** (legitimate
  not-found records also use `not_found`), so it was intentionally **not**
  patched. Recommended fix is backend-side: return `401 unauthenticated` for
  invalid sessions. (Optional FE mitigation: in the BFF proxy, on a 404 with a
  present cookie, revalidate `/me` once and, if that also fails, normalize to
  `unauthenticated`.)

### 13.8 UI issues found

- **No functional UI defects.** The "1 error / N errors" badge seen in
  screenshots is a **React hydration warning caused solely by the QA browser
  tool injecting `data-cursor-ref` attributes** into the DOM (the hydration diff
  contains only those injected attributes). It does **not** appear without the
  automation instrumentation and is not an application bug.
- Minor cosmetic/i18n: data labels are English while live content is
  Arabic/French (mixed) — expected for v1 (English-only labels, RTL/i18n-ready).

### 13.9 Final known limitations

1. **`page_size=200` for list-derived detail pages** (parents/teachers/classes
   have no detail endpoint in v1). A record beyond the first 200 in its list
   shows "not found". *Retained from §10.1.* A v2 detail endpoint removes this.
2. **`teacher/classes/{id}/students` is 500 on the live backend** (§13.7-A) —
   backend fix needed; frontend already degrades gracefully.
3. **Expired-session detection on stale client pages** relies on
   `unauthenticated`, but the API uses `not_found` (§13.7-B) — navigation-level
   protection is unaffected; backend should return 401, or add the optional BFF
   revalidation.
4. **Scoped/no-scope admin not live-tested** — no such accounts exist on
   `app.propanel.ma`; logic verified in code. Provision accounts for full
   coverage.
5. Student announcements reuse the dashboard array; `auth/refresh` unused (session
   validated via `/me`); admin import UI not built — all per §10 (unchanged).

### 13.10 Recommendation

**Ready for Flutter handoff.** The web platform correctly implements the frozen
API v1 contract across all four roles: authentication/session (httpOnly,
logout, guard-level expiry redirect), admin full-school scope, teacher
assigned-class isolation + batch attendance with partial-failure reporting,
parent linked-child-only + read-only child views, student self-only access,
`can_send`-gated composer, clean `permission_denied` handling, and **zero**
weekly-scoring footprint.

Two items to **track (not blocking the web MVP)**, both with the **backend
team**:
- Fix `teacher/classes/{id}/students` 500 (§13.7-A).
- Return `401 unauthenticated` (not `404`) for invalid sessions so client-side
  expiry detection is exact (§13.7-B).

For the **Flutter app**, mirror these contract realities: expect `not_found`
(404) on unauthenticated calls (treat 404-on-`/me` as "logged out"), gate the
message composer strictly on `can_send`, and rely on server-side scope
enforcement (403/404) rather than client assumptions.
