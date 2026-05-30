# Attendance Status Frontend Patch Report — Smart School Connect (Next.js Web)

**Date:** 2026-05-30
**Phase:** Attendance contract alignment + continued UX/UI polish
**Scope:** Align the Next.js web frontend with the final Odoo API v1 attendance
status contract, then continue safe UX/UI polish. No API, BFF auth/session,
role routing, admin scope, or permission logic was changed.

---

## 1. Summary

Odoo API v1 (the source of truth) replaced the `excused` / `excused_absence`
attendance status with `left_early`. This patch aligns the Next.js web MVP with
that final contract across types, labels, badges, chips, the teacher batch form,
summaries, and every admin / parent / student / dashboard attendance surface.

The final MVP attendance statuses are now exactly:

| Value | English label | Tone / color |
|-------|---------------|--------------|
| `present` | Present | green |
| `absent` | Absent | red |
| `late` | Late | amber |
| `left_early` | Left early | blue |

`excused`, `excused_absence`, and the "Excused" label no longer exist anywhere
in the MVP UI or API-facing code. Weekly scoring was **not** added and remains
absent. A small, safe UX/UI polish increment was applied to the teacher batch
flow (removal of the risky "mark all (any status)" shortcut).

`npx tsc --noEmit` is clean and `npm run build` compiles all 25 routes
successfully with build-time linting and type checks passing.

---

## 2. Attendance Status Alignment

- **Status enum** (`src/types/attendance.ts`):
  `'present' | 'absent' | 'late' | 'excused_absence'` →
  `'present' | 'absent' | 'late' | 'left_early'`.
- **Labels** (`src/lib/utils/labels.ts`): `Excused` → `Left early`.
- **Tones** (`ATTENDANCE_TONE` + per-page tone maps): `excused_absence: 'blue'`
  → `left_early: 'blue'` (blue chosen from the allowed blue/purple options;
  reuses existing `--c-blue` token, no new colors invented).
- **Summary shape** (`AttendanceSummary`): now

  ```ts
  {
    present: number;
    absent: number;
    late: number;
    left_early: number;
    total: number;
    total_recorded?: number; // kept optional (legacy aggregate, still surfaced)
    total_days?: number;      // kept optional (legacy aggregate, still surfaced)
  }
  ```

  `left_early` is required and replaces `excused_absence`. `total` was added per
  the new contract. `total_recorded` / `total_days` are retained as **optional**
  so the QA-verified admin "Total recorded" and parent "Total days" cards keep
  working; both now fall back to `total` when the legacy field is absent.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `src/types/attendance.ts` | `AttendanceStatus` enum, `AttendanceSummary` shape (`left_early`, `total`) |
| `src/lib/utils/labels.ts` | `ATTENDANCE_LABEL` (`Left early`) + `ATTENDANCE_TONE` (`left_early: blue`) |
| `src/features/attendance/attendance-batch.tsx` | Allowed statuses, status→button color map, removed risky "mark all (any status)" shortcut (kept only "Mark all present") |
| `src/app/teacher/attendance/page.tsx` | (no status literal — uses batch component; unchanged logic) |
| `src/app/admin/attendance/page.tsx` | Filter `STATUSES` array → `left_early` |
| `src/app/student/attendance/page.tsx` | Filter `STATUSES` array → `left_early` |
| `src/app/parent/children/[id]/attendance/page.tsx` | Filter `STATUSES` array → `left_early` |
| `src/app/admin/dashboard/page.tsx` | `ATT_KEYS` + `ATT_TONE` → `left_early`; "Total recorded" falls back to `total` |
| `src/app/student/dashboard/page.tsx` | `ATT_KEYS` + `ATT_TONE` → `left_early` |
| `src/app/parent/children/[id]/student-view/page.tsx` | `ATT_KEYS` + `ATT_TONE` → `left_early`; "Total days" falls back to `total` |
| `UX_UI_POLISH_REPORT.md` | "Excused" references updated to "Left early" (plan/report alignment) |
| `ATTENDANCE_STATUS_FRONTEND_PATCH_REPORT.md` | This report (new) |

Components that consume the above without literals (e.g.
`src/components/badges/attendance-badge.tsx`) automatically reflect the new
status via the shared `ATTENDANCE_LABEL` / `ATTENDANCE_TONE` maps — no edit
needed.

---

## 4. excused / excused_absence References

- **Removed from all MVP UI and API-facing code.** A full-source search for
  `excused` / `Excused` returns **no** code values, labels, enum members, chips,
  badges, filter options, or payload fields.
- **Historical docs:** `UX_UI_POLISH_REPORT.md` line items that previously read
  "Excused" were updated to "Left early" so the plan matches the shipped
  contract. No stale "Excused" wording remains in reports.
- No occurrence of `excused_absence` exists in any payload-building code, so the
  batch endpoint can never send it.

---

## 5. UX/UI Polish Changes (this increment)

The broad polish pass (v2) was already completed and is documented in
`UX_UI_POLISH_REPORT.md` (semantic status colors, stat-card accents, read-only
InfoBanner, admin scope banner, global states, tables/pagination, topbar/sidebar
brand + long-name handling, channel composer gating). This increment adds:

- **Teacher batch — safe default workflow:** removed the "mark all" shortcut for
  *every* status (which included a risky one-click "all absent"). Replaced with a
  single, clearly-labeled **"Mark all present"** action and the helper text
  "Everyone present by default —", reinforcing: students are present unless
  marked otherwise; teachers mark only the exceptions (absent / late /
  left early). The visible save state (`save-bar--dirty`) and partial
  success/failure toasts are unchanged.
- **Summary resilience:** admin "Total recorded" and parent "Total days" cards
  now read the new `total` field as a fallback, keeping the cards correct under
  the new summary shape without breaking the legacy fields.

---

## 6. Screens Polished / Aligned

- Admin → Dashboard (attendance cards), Attendance (status filter)
- Teacher → Attendance batch (status buttons, mark-all, save bar)
- Parent → Child attendance (status filter), Child student-view (read-only
  attendance summary cards + total)
- Student → Dashboard (attendance summary cards), Attendance (status filter)
- Shared → Attendance badge/chip (`AttendanceBadge`) across every portal

---

## 7. Commands Run

```bash
npx tsc --noEmit     # ✓ 0 errors
npm run build        # ✓ Compiled successfully; lint + type checks passed; 25/25 routes
npm run lint         # ⚠ next lint not yet configured (interactive setup prompt);
                     #   build-time linting (run by `next build`) passed.
```

No new dependencies, ESLint config, or scripts were added (out of scope).

---

## 8. Regression Checks

| Check | Status |
|-------|--------|
| Login works | ✅ No auth files touched |
| BFF auth (httpOnly session) still works | ✅ `api/auth/*` and `api/odoo/[...path]` untouched |
| Logout works | ✅ Logout route untouched |
| Role routing still works | ✅ Layout/guards untouched |
| Admin scope still respected | ✅ `lib/permissions/scope.ts` & `nav-config.ts` untouched |
| Teacher sees only assigned classes | ✅ `endpoints.teacher.classes` unchanged |
| Teacher attendance batch still saves | ✅ Submit logic unchanged; only status set + mark-all UI |
| Parent child-view remains read-only | ✅ No composer; read-only banner intact |
| Parent cannot send as student | ✅ No send action in child-view |
| Student sees only own data | ✅ Endpoints unchanged |
| Composer appears only when `can_send=true` | ✅ Channel gating logic unchanged |
| Weekly scoring remains absent | ✅ Not present in any file |
| `excused_absence` no longer exists in MVP UI/API code | ✅ Confirmed via full-source search |

---

## 9. Confirmation — Batch attendance sends `left_early`

The teacher batch form's allowed statuses are
`['present', 'absent', 'late', 'left_early']`. When a teacher selects "Left
early", the row status is `left_early`, and the batch payload submits
`items[].status = 'left_early'` verbatim to
`POST /teacher/classes/{id}/attendance/batch`. The form has **no** path that can
emit `excused_absence`.

## 10. Confirmation — Summaries read `left_early`

All attendance summary surfaces (admin dashboard `attendance_today`, student
dashboard `attendance_summary`, parent child student-view `attendance_summary`)
iterate `ATT_KEYS = ['present', 'absent', 'late', 'left_early']` and read
`summary.left_early`. The `AttendanceSummary` type requires `left_early`.

## 11. Confirmation — No weekly scoring added

No weekly scoring types, fields, endpoints, UI, or copy were added. The feature
remains entirely absent from the MVP.

---

## 12. Known Limitations

1. **`total` vs `total_recorded` / `total_days`:** the live API previously
   surfaced `total_recorded` (admin) and `total_days` (parent). Since the
   attendance patch only changed the *status* enum, these legacy aggregate
   fields are kept optional and read first, with `total` as fallback. If the API
   later standardizes on `total` only, the cards already handle it.
2. **`next lint` not configured:** standalone ESLint is not set up; linting runs
   only via `next build` (which passed). Setting up ESLint was out of scope.
3. **No automated visual/regression tests:** changes verified via type check,
   build, and source search. Manual smoke test per role is recommended.
4. **Windows build cleanup:** Next.js 15.1.12 may emit an `EPERM` during worker
   cleanup after a successful build (known upstream, unrelated); this run
   completed cleanly.

---

## 13. Final Recommendation

The frontend is aligned with the final Odoo API v1 attendance contract
(`present` / `absent` / `late` / `left_early`) with no residual `excused`
references, no weekly scoring, and all Live-QA behaviors preserved. Recommended
next: a quick manual smoke test of the teacher batch save (verify `left_early`
in the network payload) and the admin/parent/student summary cards against the
live `alwah` database, then deploy to Vercel `main`.
