# SSC-API-2026.16.001 — Student Multi-Subject Assessment Summary Contract

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Student Multi-Subject Continuous Assessment Results** API. Human-readable source
of truth; machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-STUDENT-360-MULTI-SUBJECT-ASSESSMENT-SUMMARY-1`
**Last updated:** 2026-07-12

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.16.001` |
| **Frontend release** | `school-nextjs-v2026.16.001` |
| **Required backend capability** | Student multi-subject continuous assessment results (admin read-only) |
| **Required backend contract** | `SSC-API-2026.16.001` |
| **Odoo module** | `smart_school_connect` |
| **Reference Odoo commit** | Student multi-subject Results API `04eab51208601562f85f5ae3c770537a1d0ee21d` |
| **Minimum confirmed backend module version** | *Not asserted in this contract* (commit-based requirement only) |
| **Compatible backend** | Odoo `smart_school_connect` on `main` containing commit `04eab51208601562f85f5ae3c770537a1d0ee21d` (or an equivalent descendant) |
| **Backend upgrade required for this feature** | **Yes** — for environments that do not contain `04eab512` or a descendant |
| **Breaking API changes** | **No** (`none` — additive student-level Results endpoint) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.15.001` — Class Multi-Subject Results Contract |

---

## Purpose

Documents Next.js adoption of the **Student 360 Multi-Subject Assessment Summary**:

- Admin read-only section inside Student 360 Academic tab
- Context selectors: academic year → term (class/level from enrollment / payload)
- Coverage summary and warnings presentation from backend
- Per-subject result cards without frontend recalculation
- No overall average, ranking, report cards, PDF, or mutations

---

## Endpoints

Prefix: `/api/v1`

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/assessment/students/{student_id}/results?academic_year_id={id}&term_id={id}` | Admin student multi-subject Results read |

---

## Payload notes

- Top-level fields: `status` (optional), `reason` (optional), `context`,
  `student`, `enrollment`, `subjects`, `results`, `coverage`, `warnings`.
- `context` includes school/year/term/class identifiers and display names.
- `student` carries `student_id`, optional `student_name` / `student_code`.
- `enrollment` may be null when the student is not enrolled for the year.
- `subjects[]` are gradebook columns (`gradebook_id`, `subject_id`, names/codes,
  `gradebook_state`, optional scheme/mode).
- `results[]` carry per-subject `status`, `score`, `max_score`,
  `normalized_score`, completion fields, optional `reason` / `gradebook_state`.
- Observed statuses include `available`, `complete`, `partial`, `not_computable`,
  and `not_available` (e.g. `student_not_in_gradebook_roster`).
- `coverage` exposes backend counts only (`subjects_count`,
  `available_subjects`, `complete_subjects`, `partial_subjects`,
  `not_computable_subjects`, `not_available_subjects`, `missing_subjects`).
- Frontend must preserve `score = 0` vs missing (`null`) without falsy coercion,
  and must not invent overall averages or rankings.

---

## Tenant alignment

| Tenant | Status in this phase |
|--------|----------------------|
| **school** | Already aligned and verified (read-only QA) |
| **nibras** | Not upgraded or verified |
| **alwah** | Not upgraded or verified |

---

## Relationship to prior contracts

**SSC-API-2026.13.001** remains the Gradebook list/detail/entries/lifecycle
contract.

**SSC-API-2026.14.001** remains the per-gradebook Results View contract.

**SSC-API-2026.15.001** remains the class-level multi-subject Results workspace
contract.

**SSC-API-2026.16.001** is **additive** and covers the student-level multi-subject
Results endpoint + Student 360 Academic summary only. It does **not** supersede
13.001, 14.001, or 15.001.

---

## Next.js implementation map

| Area | Location |
|------|----------|
| Types | `src/types/student-multi-subject-results.ts` |
| Endpoints | `src/lib/api/endpoints.ts` (`studentMultiSubjectResults`) |
| Adapter | `src/features/admin/students/api/student-multi-subject-results-api.ts` (`getStudentMultiSubjectResults`) |
| Presenters | `src/features/admin/students/utils/student-multi-subject-results-present.ts` |
| UI | `src/features/admin/students/components/student-academic-results-*.tsx` |
| Tab | `src/features/admin/students/utils/student-360-tabs.ts` (`academic`) |
| Config mirror | `src/config/backend-contract.ts` (`STUDENT_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT`) |
