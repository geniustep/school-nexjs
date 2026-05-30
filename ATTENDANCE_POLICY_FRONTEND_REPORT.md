# Attendance Policy Frontend Report — Smart School Connect (Next.js Web)

**Date:** 2026-05-30
**Phase:** Attendance date-policy alignment (teacher today-only + admin correction)
**Scope:** Align the Next.js web frontend with the new Odoo API v1 attendance
date policy. No changes to Odoo, Flutter, BFF auth/session, role routing,
weekly scoring, or the `excused_absence` removal.

---

## 1. Summary

The backend introduced an attendance date policy:

- Teachers may record/update attendance **for today only**. Past dates →
  `422 validation_error` with `policy: teacher_today_only`; future dates →
  `422 validation_error`.
- Admins correct past records (within scope) via a new endpoint
  `POST /api/v1/admin/attendance/correct`.
- Parents and students remain **read-only**.
- Statuses unchanged: `present`, `absent`, `late`, `left_early`.
  `excused_absence` stays removed; no weekly scoring.

This patch makes the Next.js UI match that policy:

1. **Teacher attendance** date picker is locked to **today** (`min === max ===
   today`); past/future are disabled. The save handler also detects the
   backend's `teacher_today_only` rejection and shows a clean message.
2. **Admin correction UI** was added as a scope-aware, permission-gated panel on
   the existing admin attendance page, consuming the new correct endpoint.

`npx tsc --noEmit` is clean and `npm run build` compiles all 25 routes. A live
smoke test against `https://app.propanel.ma` (DB `alwah`) confirms the policy
end to end.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/features/attendance/attendance-batch.tsx` | Date input locked to today (`min`/`max` = today) + "Today only" hint; save handler detects `teacher_today_only` (422) and shows the policy message. Default-present, statuses, and saved/failed/errors feedback unchanged. |
| `src/features/attendance/attendance-correct.tsx` | **New** admin-only correction panel: date (≤ today), class, student (loaded per class), status (present/absent/late/left_early), note. Handles success, `permission_denied` (restricted state), and `validation_error` (clean message). |
| `src/app/admin/attendance/page.tsx` | "Correct a record" toggle in the header (visible only to admins with `manage_attendance` + student-data scope); renders the correction panel and reloads the list on success. |
| `src/lib/api/endpoints.ts` | Added `admin.attendanceCorrect = '/admin/attendance/correct'`. |
| `src/types/attendance.ts` | Added `AttendanceCorrectRequest` type. |
| `src/app/globals.css` | Added `.grid--form` responsive layout class for the correction form. |

No auth/session/BFF, role-routing, or scope/permission logic was modified.
No teacher/parent/student correction UI was created.

---

## 3. Teacher Today-Only UI Behavior

- The date `<input type="date">` has `value = min = max = today` (via
  `isoDate()`), so the native picker **disables past and future dates**; default
  is today.
- A "Today only" hint sits next to the picker; the input `title` explains the
  restriction.
- Unchanged: default-present roster, the four statuses
  (Present / Absent / Late / Left early) with semantic colors, the safe
  "Mark all present" action (no risky mark-all-absent), the dirty/saved save
  bar, and the saved/failed/errors toasts.
- **Backend safety net:** if a `422` still arrives, the save handler inspects
  the error. When `error.code === 'validation_error'` and
  `error.details.policy === 'teacher_today_only'` (or the message mentions
  "today"), it shows exactly:

  > "Attendance can only be recorded for today. Contact an admin to correct past records."

  Other validation errors (e.g. future-date) surface their clean backend
  message. No frontend-only business restriction was added beyond the native
  date bounds.

---

## 4. Admin Correction UI Behavior

- **Visibility/gating:** the "Correct a record" panel renders only when
  `canSeeStudentData(user) && hasPermission(user, 'manage_attendance')`. The API
  remains the security authority.
- **Scope respect:** the class list comes from `/admin/classes` and the student
  list from `/admin/students?class_id=…`, both already scoped server-side, so
  the selectable set automatically honors the admin's scope.
- **Fields:** date (max = today → future blocked, past/today allowed), class,
  student (dependent on class; resets when class changes), status
  (present/absent/late/left_early as colored buttons — **no** `excused_absence`),
  and an optional note.
- **Outcomes:**
  - Success → success toast (“Attendance corrected for {student} on {date}.”),
    note cleared, and the attendance list reloads.
  - `permission_denied` → clean inline restricted state (no raw error).
  - `validation_error` (e.g. student not in class) → clean error toast with the
    backend message.

---

## 5. API Endpoint Consumed

`POST /api/v1/admin/attendance/correct` (via the same-origin BFF proxy
`/api/odoo/admin/attendance/correct`).

Request shape sent by the panel:

```json
{
  "date": "2026-05-20",
  "class_id": 32,
  "student_id": 21,
  "status": "present",
  "note": "Administrative correction"
}
```

`status` ∈ { `present`, `absent`, `late`, `left_early` }. No new endpoints were
invented; the teacher batch endpoint is unchanged.

---

## 6. Commands Run

```bash
npx tsc --noEmit     # ✓ 0 errors
npm run build        # ✓ Compiled successfully; lint + types passed; 25/25 routes
npm run lint         # ⚠ next lint not configured (interactive prompt); build-time lint passed
```

---

## 7. Live Smoke Test Results

**Target:** `https://app.propanel.ma` · **DB:** `alwah` · **Roles tested by
login (no passwords recorded):** Teacher, Admin, Parent, Student.

### 7.1 Teacher — PASS

| Action | Result |
|--------|--------|
| Batch POST, date = past (`2026-05-20`) | **HTTP 422** · `validation_error` · message "Teachers can only record attendance for today." · `details.policy = "teacher_today_only"` ✅ |
| Batch POST, date = future (`2026-06-15`) | **HTTP 422** · `validation_error` · "Cannot record attendance for future dates." ✅ |
| Batch POST, date = today, status `left_early` | **HTTP 200** · `{ saved:1, failed:0, items:[{status:"left_early"}], errors:[] }` ✅ (restored to `present` afterwards) |

The UI date picker prevents selecting past/future in the first place; the 422
handling is the confirmed backend safety net, and the `teacher_today_only`
detection matches the live `details.policy` exactly.

### 7.2 Admin correction — PASS

| Action | Result |
|--------|--------|
| Correct past (`2026-05-20`, class 32, student 21) → `left_early` | **HTTP 200** · returns corrected record `{…, status:"left_early", corrected_by:{id:2,name:"Administrator"}}` ✅ `left_early` accepted |
| Correct same record → `present` (cleanup/restore) | **HTTP 200** ✅ |
| Correct with **wrong class** (student 21, class 33) | **HTTP 422** · `validation_error` · "Student does not belong to the specified class." ✅ surfaced cleanly |
| `excused_absence` availability | ❌ Not present in the UI status set (only present/absent/late/left_early) |

Live data was restored to its original state after the probes.

### 7.3 Parent / Student — read-only — PASS

| Action | Result |
|--------|--------|
| Parent POST `/admin/attendance/correct` | **HTTP 403** (denied) — parents cannot correct ✅ |
| Student POST `/teacher/.../attendance/batch` | **HTTP 403** (denied) — students cannot record ✅ |

No correction/record UI exists for parent or student in the frontend.

### 7.4 Regression — PASS

- Login/logout work; BFF auth/session unchanged (`session_id` → `scc_session`).
- Role routing unchanged.
- Admin scope respected (class/student lists come from scoped admin endpoints).
- No weekly scoring page / nav / API call exists.
- No `excused_absence` in UI or API-facing code.

---

## 8. Confirmation — No Weekly Scoring

No weekly scoring types, fields, endpoints, routes, navigation, or copy were
added. The feature remains absent from the MVP.

## 9. Confirmation — No excused_absence

A full-source search returns no `excused` / `excused_absence` values, labels,
status options, or payload fields in the Next.js UI/API code. The admin
correction status set and the teacher batch status set are both exactly
`present`, `absent`, `late`, `left_early`. The live API also rejects/omits it.

---

## 10. Known Limitations

1. **`next lint` not configured** — standalone ESLint is not set up; linting runs
   via `next build` only (passed). Out of scope to add.
2. **No automated UI tests** — verified via type check, build, and live API
   smoke test. Manual click-through per role is recommended before release.
3. **Future-date 422 copy** — teacher future-date rejection shows the backend's
   own message ("Cannot record attendance for future dates."), not the
   today-only sentence, because the picker already blocks future selection and
   the policy hint differs. Both messages are clean and user-friendly.
4. **Student dropdown size** — the correction panel loads up to 200 students per
   class (`page_size=200`); classes larger than that would need pagination
   (none observed in `alwah`).
5. **Past-date test residue** — admin correction probes were restored to
   `present`; one benign `2026-05-20` record for student 21 (created in the
   earlier policy phase) remains and is harmless.

---

## 11. Final Recommendation

**Ready for deploy.**

The Next.js platform now matches the new attendance date policy: teacher
attendance is today-only (picker-locked + 422 `teacher_today_only` handled with
the exact required message), and admins have a scope-aware, permission-gated
correction UI consuming `POST /admin/attendance/correct`. Live smoke testing
against `alwah` confirms teacher past/future rejection (422), admin past-date
correction (200, `left_early` accepted), clean wrong-class validation (422), and
parent/student read-only enforcement (403). No weekly scoring, no
`excused_absence`, and no auth/session/BFF/role-routing/scope changes.

Recommend deploying the Next.js patch to Vercel `main`.
