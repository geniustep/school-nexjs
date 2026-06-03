# Odoo backend sync — Next.js dashboard

**Odoo module:** `smart_school_connect` **18.0.1.0.10** (database `alwah`)  
**Scope:** Next.js only. No Odoo or public API contract changes.

## What was verified (no change needed)

| Area | Status |
|------|--------|
| BFF session cookie (`/api/auth/login`, `/api/odoo/*`, attachments) | Unchanged |
| `GET /api/v1/me` — single `school`, no `school_ids` | Types use `CurrentUser.school` only |
| Teacher scope | `GET /teacher/classes` + per-class endpoints; 403 → `PermissionDeniedState` |
| Parent children | `GET /parent/children` only; no email/phone inference |
| Student homework | `/student/homeworks` (not `/student/homework`) |
| Attendance states | `present`, `absent`, `late`, `left_early` only; no `excused_absence` in `src/` |
| Student display names | `getStudentDisplayName`: full_name → name → first + last |

## Files modified (this sync)

| File | Change |
|------|--------|
| `src/types/student.ts` | `StudentNameFields`; optional `full_name`/`name`; optional `parents` |
| `src/types/parent.ts` | Optional `children`; `ParentChild` extends name fields |
| `src/types/attendance.ts` | Student nested types use `StudentNameFields` |
| `src/types/class.ts` | Comment: class hub + future assignment/enrollment |
| `src/lib/utils/student.ts` | Re-export `StudentNameFields` from types |
| `src/lib/api/endpoints.ts` | Sync comment + routing rules |
| `src/app/admin/students/[id]/page.tsx` | Safe `(parents ?? [])` |
| `src/app/admin/parents/page.tsx`, `[id]/page.tsx` | Safe `(children ?? [])` |
| `src/app/admin/attendance/page.tsx` | `getStudentDisplayName` for roster column |
| `src/features/attendance/attendance-batch.tsx` | Display names in roster build |
| `src/features/attendance/attendance-correct.tsx` | Display names in select + toast |
| `src/app/parent/children/page.tsx` | i18n + empty state via `empty.children` |

## API paths (registry: `src/lib/api/endpoints.ts`)

All remain existing v1 paths. Key routes for regression:

- Auth: `/me` (server-only via BFF)
- Admin: `/admin/students`, `/admin/classes`, `/admin/attendance`, …
- Teacher: `/teacher/classes`, `/teacher/classes/{id}/students`, class-scoped homework/resources/exams
- Parent: `/parent/children`, `/parent/dashboard`
- Student: `/student/profile`, `/student/homeworks`, `/student/resources`, `/student/exams`

**Not added:** assignment or enrollment REST routes (not on API v1 yet).

## Known limitations / TODOs

1. **Class subject–teacher assignments** (`school.class.assignment`)  
   When API exposes list/detail for a class, add endpoints in `endpoints.ts` and show on teacher/admin class hub pages.

2. **Student enrollment history** (`school.student.enrollment`)  
   Keep using `class` / `current_class_id` from existing payloads until enrollment APIs exist. Do not replace list filters with enrollment client-side.

3. **Teacher multi-school**  
   `/me` returns one `school` (`teacher.school_id`). Cross-school class lists must come from backend; do not filter by invented `school_ids` on the client.

4. **Admin attendance list page**  
   Still uses hard-coded English labels in toolbar (pre-existing); attendance *status* set is correct.

## QA accounts (smoke test when Odoo is up)

| Role | Login | Password |
|------|-------|----------|
| admin | `done` | `admin123` |
| teacher | `qa.teacher` | `teacher123` |
| parent | `qa.parent` | `parent123` |
| student | `qa.student` | `student123` |

Run locally: `npm run typecheck`, `npm run build`, then exercise admin/teacher/parent/student dashboards and attachment download with session cookie.

## Confirmation

- No Odoo module changes  
- No new backend endpoints  
- No JWT  
- No `excused_absence`  
- No inference of parent children from contact fields
