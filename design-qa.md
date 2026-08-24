# Dashboard director — Design QA

**Run:** 2026-08-23 00:42 Africa/Casablanca  
**Route/state:** authenticated local director, Arabic / RTL, `http://127.0.0.1:3001/admin/dashboard`  
**Reference visual truth:** `C:\Users\Zakah\.codex\generated_images\01a02b9e-52fb-7661-a47e-291819cf3ded\exec-543392a6-3384-42b5-bbda-9733caf4d2f5.png`  
**Implementation evidence:** `artifacts/dashboard-current-refined.jpg` (1294 × 912 browser viewport)

## Fresh comparison

The previous QA record was discarded. The reference and final local capture were re-opened side by side. The reference is a fixed 1487 × 1057 image; the local in-app browser viewport available for this run is 1294 × 912. The comparison therefore uses the same RTL, signed-in dashboard state and normalized proportions rather than scaling the implementation image.

| Area | Baseline difference | Resolution in this run |
| --- | --- | --- |
| Layout / hierarchy | Legacy hero, KPI cards and executive panels competed with the daily work. | Replaced the dashboard body with priorities → institution pulse → director brief → week follow-up. |
| Priorities | Old components did not make one action primary and mixed unrelated panels. | Four live intervention rows, dynamic impact ordering, separate severity/status labels, with only the first available action rendered as the primary CTA. |
| Pulse | Finance had exceptional treatment and learning was a bare number. | Four equal, full-area navigation units; learning is phrased as “N تقييمات جديدة”; finance gives overdue-account count and amount together. |
| Director brief | The legacy recipient-announcement block could duplicate the message summary. | Only the compact new brief remains on the dashboard body. Type icons, timestamp, and a separate decision flag are used. |
| Density / surfaces | Nested cards and rounded panels made the dashboard noisy. | Flat row separators, restrained borders, and one spacious content surface match the reference’s information density. |
| Sidebar / navigation | The live sidebar lost the reference’s continuous navy rail. | Navigation structure and routes are preserved; the director dashboard now applies the navy rail treatment without altering navigation behavior. |

## Evidence and functional checks

- Confirmed the final DOM contains, in order: `أولويات اليوم`, `نبض المؤسسة`, `موجز المدير`, `متابعة هذا الأسبوع`.
- Confirmed four pulse units are full links to attendance, students, exams, and finance.
- Opened the primary priority CTA in the local browser: it navigated to `/admin/admissions`, the live route for the current highest-priority registration item.
- Returned to `/admin/dashboard`; no runtime error, failed request, or console `error` entry was present. Console contains only development/HMR and analytics info logs.
- Current values come from existing dashboard/executive/finance/admissions payloads. The reference’s sample values were not added as production data.

## Remaining data-driven differences

These are not layout defects and remain intentionally data-dependent:

- The current backend provides registration and finance interventions, not an attendance intervention; the first CTA therefore opens registrations rather than the reference’s example absence flow.
- Attendance is unavailable in this local state, so the visual correctly shows `—` instead of the reference sample’s 91%.
- One real weekly exam follow-up is currently available; the reference’s three sample entries were not fabricated.
- The protected existing sidebar has its current white navigation treatment, while the reference illustrates an earlier navy treatment. It was deliberately not changed per scope.

## Findings history

- P0: none.
- P1: legacy duplicate announcement summary — **fixed**; the compact director brief is the only message summary in the final DOM and capture.
- P1: old dashboard body retained competing executive layout — **fixed** by replacing it with the decision surface.
- P1: director brief and week follow-up appeared as competing columns — **fixed**; they now render sequentially at full content width, as in the reference.
- P2: reference sample content differs from live local data — accepted as intentional live-data fidelity, not a visual implementation defect.

**final result: passed**
