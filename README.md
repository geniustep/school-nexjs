# Smart School Connect — Next.js Web Platform

Multi-role web platform for Smart School Connect, built strictly against the
**frozen Odoo API v1** contract (`API_REPORT.md`). It serves four portals from a
single app: **Admin**, **Teacher**, **Parent**, and **Student**.

> Odoo is only the backend engine. No Odoo/technical vocabulary is exposed to
> end users, and no endpoints outside the frozen v1 contract are used.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- Clean, feature-based architecture
- Central API client, central session/auth layer
- Role-based routing + permission/scope-aware navigation
- Responsive, RTL-ready styling (CSS logical properties)
- No runtime UI dependencies (lightweight, custom design system)

---

## Architecture: Backend-for-Frontend (BFF)

The API uses **Odoo session cookies** (`/web/session/authenticate`). To keep the
session secure (httpOnly) and avoid CORS, the browser **never** talks to Odoo
directly. Next.js acts as a BFF:

```
Browser ──▶ Next.js route handlers ──▶ Odoo /api/v1/*
            (httpOnly session cookie)
```

- `POST /api/auth/login` → authenticates with Odoo, stores `session_id` in an
  httpOnly cookie, returns the resolved user (`/api/v1/me`).
- `POST /api/auth/logout` → clears the Odoo session + local cookie.
- `GET|POST /api/odoo/[...path]` → generic proxy that injects the session cookie
  and forwards to `/api/v1/...`.

Server components/guards read the session directly via `src/lib/api/server.ts`;
client components use `src/lib/api/client.ts` (which targets the proxy).

---

## Project structure

```
src/
  app/
    api/{auth/login,auth/logout,odoo/[...path]}/  # BFF routes
    login/                                        # login page
    admin/  teacher/  parent/  student/           # role portals (guarded layouts)
  components/   # layout, navigation, ui, tables, states, badges
  features/     # auth, channels, attendance, announcements, parent
  lib/
    api/        # client.ts, server.ts, odoo-server.ts, endpoints.ts
    auth/       # session.ts, guards.ts
    permissions/# permissions.ts, scope.ts
    routes/     # role-routes.ts
    hooks/      # use-resource.ts
    utils/      # labels, format, cn
  types/        # api, user, permissions, scope, student, parent, teacher,
                # class, attendance, channel, message, dashboard
```

`src/lib/api/endpoints.ts` is the **single source of API paths** — every path is
taken verbatim from `API_REPORT.md §3`.

---

## Getting started

```bash
npm install
cp .env.example .env        # set ODOO_BASE_URL + ODOO_DB
npm run dev                 # http://localhost:3000
```

### Environment

| Var                  | Purpose                                            | Default                  |
| -------------------- | -------------------------------------------------- | ------------------------ |
| `ODOO_BASE_URL`      | Odoo backend base URL (server-only, never exposed) | `http://localhost:8069`  |
| `ODOO_DB`            | Odoo database name for authentication              | `alwah`                  |
| `SESSION_COOKIE_NAME`| Name of the local httpOnly session cookie          | `scc_session`            |

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

---

## Role behavior

| Role    | After login →         | Sees                                                            |
| ------- | --------------------- | --------------------------------------------------------------- |
| admin   | `/admin/dashboard`    | Scope-filtered school data (see below)                          |
| teacher | `/teacher/dashboard`  | Assigned classes only; batch attendance                         |
| parent  | `/parent/dashboard`   | Linked children; read-only child student-view                   |
| student | `/student/dashboard`  | Own profile/attendance; visible channels                        |

### Admin scope (API_REPORT.md §4)

Admin access is **always scope-based**, derived from `/api/v1/me`:

- **Super admin** (`is_super_admin` or `scope.type === 'school'`) → full school.
- **Scoped admin** (`levels` / `classes` / `level_group` / `custom`) → restricted
  navigation + data; out-of-scope requests are rejected server-side.
- **`channels` scope** → messaging only (no student/attendance sections).
- **Unconfigured admin** (no scope, not super) → **blocked**: the dashboard shows
  an access-restricted state and no data sections are linked.

The frontend hides inaccessible navigation and shows permission-denied states,
but the **server remains the source of truth**.

### Channels & messaging

The message composer is shown **only** when the server returns `can_send: true`
for a channel. Parent child-view channels are always `can_send: false`
(read-only) — there is no composer anywhere in the child views.

---

## Not in scope (per the frozen contract)

- **Weekly scoring** — excluded from API v1; no pages, forms, charts, calls, or
  navigation exist for it anywhere.
- Admin write/management (PUT/PATCH/DELETE), push, real-time — deferred in v1.

See `IMPLEMENTATION_REPORT.md` for the full handoff report, including consumed
endpoints, tested scenarios, and known limitations.
