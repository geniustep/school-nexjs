# SSC-API-2026.15.001 — Class Multi-Subject Results Contract

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Class Multi-Subject Continuous Assessment Results** API. Human-readable source
of truth; machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-CONTINUOUS-ASSESSMENT-CLASS-MULTI-SUBJECT-RESULTS-WORKSPACE-1`
**Last updated:** 2026-07-12

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.15.001` |
| **Frontend release** | `school-nextjs-v2026.15.001` |
| **Required backend capability** | Class multi-subject continuous assessment results (admin read-only) |
| **Required backend contract** | `SSC-API-2026.15.001` |
| **Odoo module** | `smart_school_connect` |
| **Reference Odoo commit** | Class multi-subject Results API `61ba696423604ac5b721cbdee8d8a15d99ce4c68` |
| **Minimum confirmed backend module version** | *Not asserted in this contract* (commit-based requirement only) |
| **Compatible backend** | Odoo `smart_school_connect` on `main` containing commit `61ba696423604ac5b721cbdee8d8a15d99ce4c68` (or an equivalent descendant) |
| **Backend upgrade required for this feature** | **Yes** — for environments that do not contain `61ba696` or a descendant |
| **Breaking API changes** | **No** (`none` — additive class-level Results endpoint) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.14.001` — Continuous Assessment Gradebook Results Contract |

---

## Purpose

Documents Next.js adoption of the **Class Multi-Subject Results Workspace**:

- Admin read-only workspace for one class across subjects
- Context selectors: academic year → term → class
- Coverage summary and warnings presentation from backend
- Student × subject matrix without frontend recalculation
- No cross-subject average, ranking, report cards, PDF, or mutations

---

## Endpoints

Prefix: `/api/v1`

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/assessment/classes/{class_id}/results?academic_year_id={id}&term_id={id}` | Admin class multi-subject Results read |

---

## Payload notes

- Top-level fields: `context`, `subjects`, `roster`, `matrix`, `coverage`,
  `warnings`.
- `context` includes school/year/term/class identifiers and display names.
- `subjects[]` are gradebook columns (`gradebook_id`, `subject_id`, names/codes,
  `gradebook_state`, optional scheme/mode). Duplicate subject gradebooks remain
  separate columns.
- `roster[]` follows backend order (`official_roster_sequence` / `roster_sequence`);
  frontend must not re-sort by name or Massar/student code.
- `matrix[]` rows carry `subject_results[]` with `status`, `score`, `max_score`,
  `normalized_score`, completion fields, optional `reason` / `gradebook_state`.
- Observed statuses include `available`, `complete`, `partial`, `not_computable`,
  and `not_available` (e.g. `student_not_in_gradebook_roster`).
- `coverage` exposes backend counts only (`gradebooks_count`, `subjects_count`,
  `roster_count`, completeness counts, `gradebooks_by_state`, `warnings_count`).
- Frontend must preserve `score = 0` vs missing (`null`) without falsy coercion,
  and must not invent class averages or rankings.

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

**SSC-API-2026.15.001** is **additive** and covers the class-level multi-subject
Results endpoint + admin workspace only. It does **not** supersede 13.001 or
14.001.

---

## Next.js implementation map

| Area | Location |
|------|----------|
| Types | `src/types/class-multi-subject-results.ts` |
| Endpoints | `src/lib/api/endpoints.ts` (`classMultiSubjectResults`) |
| Adapter | `src/features/admin/class-results/api/class-results-api.ts` (`getClassMultiSubjectResults`) |
| Presenters | `src/features/admin/class-results/utils/class-results-present.ts` |
| Workspace | `src/features/admin/class-results/components/*` |
| Route | `src/app/admin/academics/assessment/class-results/page.tsx` |
| Config mirror | `src/config/backend-contract.ts` (`CLASS_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT`) |
