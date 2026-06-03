# Frontend F-1 — Next.js RBAC Contract Sync

**Date:** 2026-06-03  
**Odoo reference:** `origin/main` @ `a5fa8ce` (smart_school_connect on `alwah`)  
**Scope:** Next.js only — no Odoo / Flutter / i18n feature work

---

## A. Summary

Next.js RBAC contract sync against live Odoo on `alwah` (`https://app.propanel.ma`). Credentials loaded from operator **`.env.local`** (gitignored, not committed).

**Live QA:** **7/7 PASS** — all QA accounts authenticate via BFF, `/me` resolves, landing routes and permission boundaries match expectations.

---

## B. Environment (non-secret)

| Setting | Value |
|---------|--------|
| `ODOO_BASE_URL` / `ODOO_URL` | `https://app.propanel.ma` |
| `ODOO_DB` | `alwah` |
| Credential source | `.env.local` (local only) |
| Probe run | `2026-06-03T18:37:03Z` · base `http://localhost:3001` |
| Password env keys (names only) | `ODOO_QA_RBAC_PASSWORD`, `ODOO_QA_TEACHER_PASSWORD`, `ODOO_QA_PARENT_PASSWORD`, `ODOO_QA_STUDENT_PASSWORD` |

---

## C. Prior blocked run vs final run

| Run | Setup | Login result |
|-----|--------|--------------|
| First (blocked) | Single shell `QA_PASSWORD` only; no `.env.local` on server | `invalid_credentials` × 7 |
| **Final** | `.env.local` + `npm run build` + prod `:3001` + `qa-f1-probe` | **OK × 7** |

Root cause of the blocked run: credentials not loaded into Next/Odoo probe (missing `.env.local` and one password for all roles).

---

## D. Live QA — seven accounts (final)

**Commands:** `npm run typecheck` ✅ · `npm run build` ✅ · `node scripts/qa-f1-probe.mjs http://localhost:3001`  
**Source JSON:** `scripts/qa-f1-live-results.json` (gitignored; no passwords/cookies inside).

### D.1 Summary table

| Account | Login | Role / `admin_kind` | `/me` (schools · perms · scope) | Landing | Visible modules | Blocked modules | Unexpected |
|---------|-------|---------------------|----------------------------------|---------|-----------------|-----------------|------------|
| qa.pm | ✅ | `admin` / `project_manager` | `[10,9]` · active `10` · 33 · `school` · scopes 2 | `/admin/dashboard` | all 12 nav keys | _(none)_ | 12× `raw_html_*` (probe heuristic) |
| qa.schoolmgr | ✅ | `admin` / `school_manager` | `[10]` · active `10` · 33 · `school` · scopes 1 | `/admin/dashboard` | all 12 | _(none)_ | 12× `raw_html_*` |
| qa.supervisor | ✅ | `admin` / `general_supervisor` | `[10]` · active `10` · 17 · `classes` · scopes 1 | `/admin/dashboard` | all 12 | _(none)_ | 12× `raw_html_*` |
| qa.staff | ✅ | `admin` / `admin_staff` | `[10]` · active `10` · 4 · `school` · scopes 1 | **`/admin/students`** | `students` | 11 others | `raw_html_students` |
| qa.teacher | ✅ | `teacher` / — | `[10,9]` · 9 perms | `/teacher/dashboard` | 6 keys† | 6 keys† | **none** |
| qa.parent | ✅ | `parent` / — | `[10]` · 5 perms | `/parent/dashboard` | 3 keys† | 9 keys† | **none** |
| qa.student | ✅ | `student` / — | `[9]` · 4 perms | `/student/dashboard` | 3 keys† | 9 keys† | **none** |

†Portal accounts: `visibleModules` / `blockedModules` use the admin `view_*` nav map in the probe; they are **not** admin-shell nav. Portal checks: `/admin/dashboard` → **307** to role home; portal dashboard **200**, no `non_admin_reached_admin_html`.

### D.2 Per-account detail

#### qa.pm

| Field | Value |
|-------|--------|
| Login | ✅ (`passwordEnv`: `ODOO_QA_RBAC_PASSWORD`) |
| `/me` | `role=admin`, `admin_kind=project_manager`, `school_ids=[10,9]`, `active_school_id=10`, `permissionCount=33`, `scope_type=school`, `scopes_count=2` |
| Landing | `/admin/dashboard` |
| Visible | `dashboard`, `students`, `parents`, `teachers`, `classes`, `attendance`, `channels`, `homeworks`, `resources`, `exams`, `exam-results`, `timetable` |
| Blocked | — |
| Unexpected | `raw_html_dashboard`, `raw_html_students`, `raw_html_parents`, `raw_html_teachers`, `raw_html_classes`, `raw_html_attendance`, `raw_html_channels`, `raw_html_homeworks`, `raw_html_resources`, `raw_html_exams`, `raw_html_exam-results`, `raw_html_timetable` |
| Extra | School switch → 9 OK; switch → **999 forbidden (403)**. All `apiChecks`: permitted routes **200**, no mismatch. |

#### qa.schoolmgr

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_RBAC_PASSWORD`) |
| `/me` | `admin` / `school_manager`, `[10]`, active `10`, 33 perms, `scope_type=school` |
| Landing | `/admin/dashboard` |
| Visible | all 12 nav keys |
| Blocked | — |
| Unexpected | 12× `raw_html_*` |
| Extra | Switch → **9 forbidden (403)**; switch → 10 OK. |

#### qa.supervisor

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_RBAC_PASSWORD`) |
| `/me` | `admin` / `general_supervisor`, `[10]`, active `10`, 17 perms, `scope_type=classes` |
| Landing | `/admin/dashboard` |
| Visible | all 12 nav keys |
| Blocked | — |
| Unexpected | 12× `raw_html_*` |
| Extra | All permitted APIs **200**; no `api_*_allowed_without_perm`. |

#### qa.staff

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_RBAC_PASSWORD`) |
| `/me` | `admin` / `admin_staff`, `[10]`, active `10`, 4 perms, `scope_type=school` |
| Landing | **`/admin/students`** (no `view_dashboard`) |
| Visible | `students` |
| Blocked | `dashboard`, `parents`, `teachers`, `classes`, `attendance`, `channels`, `homeworks`, `resources`, `exams`, `exam-results`, `timetable` |
| Unexpected | `raw_html_students` |
| Extra | Denied APIs **403** `forbidden`; denied pages show forbidden UI (**200** + restricted). |

#### qa.teacher

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_TEACHER_PASSWORD`) |
| `/me` | `teacher`, `school_ids=[10,9]`, `permissionCount=9` |
| Landing | `/teacher/dashboard` |
| Visible (probe map) | `students`, `parents`, `teachers`, `classes`, `attendance`, `channels` |
| Blocked (probe map) | `dashboard`, `homeworks`, `resources`, `exams`, `exam-results`, `timetable` |
| Unexpected | **none** |
| Extra | `/admin/dashboard` → **307** `/teacher/dashboard`. |

#### qa.parent

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_PARENT_PASSWORD`) |
| `/me` | `parent`, `school_ids=[10]`, `permissionCount=5` |
| Landing | `/parent/dashboard` |
| Visible (probe map) | `students`, `attendance`, `channels` |
| Blocked (probe map) | `dashboard`, `parents`, `teachers`, `classes`, `homeworks`, `resources`, `exams`, `exam-results`, `timetable` |
| Unexpected | **none** |
| Extra | `/admin/dashboard` → **307** `/parent/dashboard`. |

#### qa.student

| Field | Value |
|-------|--------|
| Login | ✅ (`ODOO_QA_STUDENT_PASSWORD`) |
| `/me` | `student`, `school_ids=[9]`, `permissionCount=4` |
| Landing | `/student/dashboard` |
| Visible (probe map) | `students`, `attendance`, `channels` |
| Blocked (probe map) | `dashboard`, `parents`, `teachers`, `classes`, `homeworks`, `resources`, `exams`, `exam-results`, `timetable` |
| Unexpected | **none** |
| Extra | `/admin/dashboard` → **307** `/student/dashboard`. |

### D.3 Probe notes

- **`raw_html_*`:** SSR pages return normal HTML `<!DOCTYPE…>` on **allowed** admin routes; the probe flags these as `unexpected` but they are **not** auth leaks or RBAC failures.
- **No** `api_*_allowed_without_perm`, `page_crash_*`, or `non_admin_reached_admin_html` on portal accounts.

---

## E. Build / typecheck (pre-commit verification)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass (see § H for latest run) |
| `npm run build` | ✅ Pass |

---

## F. Secret safety & ignored artifacts

| Item | Status |
|------|--------|
| `.env.local` | Exists locally · **gitignored** · **not staged** |
| `scripts/qa-f1-live-results.json` | **gitignored** · **not staged** |
| `scripts/qa-rbac-output.json` | **not present** in tree · **gitignored** if recreated |
| `scripts/*output*.json`, `*.cookies`, `*.cookiejar` | **gitignored** |
| This report | No passwords, cookies, `session_id`, or tokens |

---

## G. Live QA status

| Metric | Result |
|--------|--------|
| Accounts tested | 7 |
| BFF login | **7/7 PASS** |
| `/me` after login | **7/7 PASS** |
| Landing route | **7/7 PASS** |
| RBAC API/page boundaries (admin) | **PASS** (staff + school switch spot-checks OK) |
| Portal isolation | **PASS** (307 away from `/admin`) |

**Overall live QA: 7/7 PASS**

---

## H. Pre-commit checks (latest run)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `git diff` secret scan | ✅ Allowed matches only (env names, placeholders, **removed** old credentials in docs/scripts) |

---

## I. Commit readiness

| Question | Answer |
|----------|--------|
| Live QA still pending? | **No** — completed 2026-06-03, 7/7 PASS |
| Must `QA_PASSWORD` be set before commit? | **No** — local `.env.local` is for operators only; not committed |
| Ready to commit F-1? | **Yes** — stage F-1 files per plan below; run `git diff --cached` before `git commit -m "sync nextjs rbac contract"` |
| Push? | **No** (per project rules) |

**Exclude from F-1 commit:** `scripts/flutter-f2-me-probe.mjs` (Flutter F-2 helper).

**Optional exclude (tighter commit):** `scripts/qa-browser-rbac.mjs`, `scripts/qa-browser-probe.mjs`, `scripts/qa-academic-patch.mjs`.

---

## J. Files recommended for commit

**Message:** `sync nextjs rbac contract`

### Include

```
src/types/user.ts
src/lib/auth/normalize-user.ts
src/lib/permissions/scope.ts
src/lib/permissions/admin-pages.ts
src/app/admin/page.tsx
src/app/admin/academic/page.tsx
src/components/admin/admin-page-guard.tsx
src/components/admin/require-admin-academic-hub.tsx
src/components/layout/app-shell.tsx
src/features/admin/command-center/admin-command-dashboard.tsx
messages/ar.json
messages/en.json
messages/es.json
messages/fr.json
scripts/qa-env.mjs
scripts/qa-f1-probe.mjs
scripts/run-f1-qa.ps1
scripts/check-next-odoo-target.mjs
scripts/odoo-direct-auth-probe.mjs
scripts/qa-rbac-check.mjs
scripts/qa-rbac-live.mjs
scripts/smoke-bff.ps1
.env.qa.local.example
.env.example
.gitignore
FRONTEND_F1_REPORT.md
ODOO_BACKEND_SYNC.md
```

### Do not include

```
.env.local
.env
scripts/flutter-f2-me-probe.mjs
scripts/qa-f1-live-results.json
scripts/qa-rbac-output.json
.next/
```

---

## K. QA scripts (reference)

`scripts/qa-env.mjs`, `qa-f1-probe.mjs`, `run-f1-qa.ps1`, `check-next-odoo-target.mjs`, `odoo-direct-auth-probe.mjs` — support F-1 verification only; no secrets in repo.
