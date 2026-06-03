# I18N-1A — Next.js Unified i18n Foundation

**Date:** 2026-06-03  
**Baseline:** `origin/main` @ `0668bb7`  
**Scope:** Next.js only — no Odoo / Flutter  
**Environment:** `ODOO_BASE_URL=https://app.propanel.ma` · `ODOO_DB=alwah` · credentials from `.env.local` (gitignored)

---

## A. Summary

Unified i18n for user-facing UI across **ar / fr / en / es** using existing `messages/*.json` + `LocaleProvider` / `useT()`. Arabic defaults to **RTL** via `document.documentElement.dir`.

**Translated:** navigation, dashboards, academic modules, admin lists, portal pages (parent/student gaps), attendance correction, channels, empty/loading states, export errors, aria-labels, enum labels (attendance, channel type, student status).

**Not translated:** API payloads, person/class/subject names, school content, routes, BFF internal error strings (shown as returned).

**Deferred:** `layout.tsx` metadata, sidebar brand “Smart School Connect”, `titleCase(relation)` on parent profile, full client-network error i18n in `lib/api/client.ts`.

---

## B. Files modified (implementation + QA fix)

| Path | Reason |
|------|--------|
| `messages/{ar,en,fr,es}.json` | +79 keys/locale (`parent`, `studentPortal`, `channels.type`, `attendance.correctPanel`, `common.*`, …) |
| `src/lib/utils/labels.ts` | Label helpers use `t()` instead of hardcoded EN/AR |
| `src/features/attendance/attendance-correct.tsx` | Full i18n |
| `src/features/announcements/announcements-feed.tsx` | Loading / empty i18n |
| `src/features/channels/*` | Channel type labels |
| `src/app/{admin,parent,student}/**` (listed in git status) | Wire `useT`, tables, headers, back links |
| `src/components/{badges/attendance-badge,layout/app-shell,i18n/locale-switcher,ui/toast}.tsx` | RTL helpers, aria, null attendance guard |
| `src/lib/utils/export-download.ts` | Export fail reasons for UI translation |
| `src/features/admin/export-button.tsx` | Translated export errors |
| `src/app/parent/dashboard/page.tsx` | Fix `attendance.null` leak when API returns empty status object |
| `scripts/qa-i18n-visual.mjs` | **New** — Playwright visual QA probe (optional commit) |

---

## C. i18n coverage

| Area | Status |
|------|--------|
| Dashboards (4 roles) | ✅ QA probed |
| Navigation | ✅ Sidebar uses `nav.*` keys |
| Homework / resources / timetable / exams / results | ✅ Teacher + student probed; admin/student/parent pages wired |
| Attendance / channels | ✅ Admin attendance + parent channels; correction panel i18n |
| Error / empty / loading | ✅ `states.tsx` + page-level empty states |
| RBAC labels | ✅ `roles.adminKind.*`, `admin.scope.*` |

---

## D. Arabic / RTL — manual QA

| Check | Result |
|-------|--------|
| `dir=rtl` + `lang=ar` on admin/teacher/parent/student (Playwright) | ✅ |
| `dir=ltr` for fr/en/es | ✅ |
| Login `/login` ar RTL + Arabic copy | ✅ |
| Required terms in `messages/ar.json` | ✅ تلميذ، ولي الأمر، الواجبات، الموارد، استعمال الزمن، الامتحانات، النتائج، الحضور، أقسامي، التسليمات، مرفقات |
| Teacher nav (ar) | ✅ PASS — أقسامي، الواجبات، استعمال الزمن |
| Admin nav uses **التلاميذ** (list label) not **تلميذ** on every screen | ✅ By design (`nav.students`) |

**Remaining:** Brand “Smart School” in sidebar stays English; brief RTL flash possible before hydration.

---

## E. Hardcoded text audit (post-QA)

| Item | User-facing? |
|------|----------------|
| `Smart School` / `Connect` in sidebar | Yes — product brand (intentional) |
| `layout.tsx` metadata | Partial (SEO) |
| `placeholder="https://"` | Technical |
| API `error.message` passthrough | Sometimes |

**Leaked keys:** None after fix (`attendance.null` on parent dashboard **fixed** during QA).

**`excused_absence` in `src/`:** 0 ✅

---

## F. Automated visual QA

**Server:** `npm run build` → `npm run start -p 3002`  
**Probe:** `node scripts/qa-i18n-visual.mjs http://localhost:3002`  
**Output:** `scripts/qa-i18n-visual-output.json` (gitignored)

### Accounts & pages

| Role | Login | Pages | ar | fr | en | es |
|------|-------|-------|----|----|----|-----|
| Admin | qa.pm | dashboard, students, attendance | RTL WARN* | LTR WARN* | PASS | LTR WARN* |
| Teacher | qa.teacher | dashboard, homeworks, timetable | **PASS** | LTR WARN* | **PASS** | LTR WARN* |
| Parent | qa.parent | dashboard, channels | **PASS** | LTR WARN* | **PASS** | LTR WARN* |
| Student | qa.student | dashboard, homeworks, timetable | RTL WARN* | LTR WARN* | LTR WARN* | LTR WARN* |

\*WARN = heuristic “term must appear on every page” (e.g. English snippets checked on French pages). **Not functional failures.**

### Final probe summary

```json
{ "pass": 5, "fail": 0, "warn": 11 }
```

- **No** leaked i18n keys in final run  
- **No** console errors captured  
- **No** broken HTTP status on probed routes  

### Bug found & fixed in QA

- **Parent dashboard** showed `attendance.null` when `today_attendance` object had null `status` → fixed in `parent/dashboard/page.tsx` + defensive `AttendanceBadge`.

### Checks not automated

- Forbidden state (needs scoped account / permission edge)  
- Export button click (labels present in `admin.export*`)  
- Parent child homework/resources subpages (same i18n wiring as siblings; not in probe list)

---

## G. Build & safety

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ PASS (after QA fix) |
| `npm run build` | ✅ PASS (after QA fix) |
| `.env.local` staged | ❌ Not staged (gitignored) |
| `scripts/qa-i18n-visual-output.json` staged | ❌ Gitignored |
| Passwords/cookies in diff | ❌ None |
| Odoo / Flutter changes | ❌ None |

---

## H. Recommendation

**Ready for commit** after human spot-check of French/Spanish nav labels (optional, 5 min).

### Recommended staging (I18N-1A only)

```
messages/ar.json
messages/en.json
messages/fr.json
messages/es.json
src/lib/utils/labels.ts
src/lib/utils/export-download.ts
src/features/attendance/attendance-correct.tsx
src/features/announcements/announcements-feed.tsx
src/features/channels/channel-chat.tsx
src/features/channels/channels-list.tsx
src/features/admin/export-button.tsx
src/components/badges/attendance-badge.tsx
src/components/layout/app-shell.tsx
src/components/i18n/locale-switcher.tsx
src/components/ui/toast.tsx
src/app/admin/channels/[id]/page.tsx
src/app/admin/classes/[id]/page.tsx
src/app/admin/classes/page.tsx
src/app/admin/parents/[id]/page.tsx
src/app/admin/parents/page.tsx
src/app/admin/students/[id]/page.tsx
src/app/admin/students/page.tsx
src/app/admin/teachers/[id]/page.tsx
src/app/admin/teachers/page.tsx
src/app/parent/channels/[id]/page.tsx
src/app/parent/channels/page.tsx
src/app/parent/children/[id]/announcements/page.tsx
src/app/parent/children/[id]/attendance/page.tsx
src/app/parent/children/[id]/channels/page.tsx
src/app/parent/children/[id]/student-view/page.tsx
src/app/parent/children/page.tsx
src/app/parent/dashboard/page.tsx
src/app/student/announcements/page.tsx
src/app/student/attendance/page.tsx
src/app/student/channels/[id]/page.tsx
src/app/student/channels/page.tsx
src/app/student/profile/page.tsx
```

**Optional separate commit or omit:** `scripts/qa-i18n-visual.mjs`  
**Do not commit:** `scripts/qa-*-output*.json`, other untracked `scripts/qa-*.mjs` unless explicitly wanted, `.env.local`, `.next/`

**Do not commit** (per instructions): this session did not create a git commit.
