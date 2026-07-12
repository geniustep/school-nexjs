# SSC-API-2026.14.001 — Continuous Assessment Gradebook Results Contract

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Continuous Assessment Gradebook Results** APIs. Human-readable source of truth;
machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-CONTINUOUS-ASSESSMENT-RESULT-WORKSPACE-1`
**Last updated:** 2026-07-12

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.14.001` |
| **Frontend release** | `school-nextjs-v2026.14.001` |
| **Required backend capability** | Continuous assessment gradebook Results aggregation (admin + teacher) |
| **Required backend contract** | `SSC-API-2026.14.001` |
| **Odoo module** | `smart_school_connect` |
| **Reference Odoo commit** | Results API `16189fedee43b3a4f8cab7cceba8697023d81f5f` |
| **Minimum confirmed backend module version** | *Not asserted in this contract* (commit-based requirement only) |
| **Compatible backend** | Odoo `smart_school_connect` on `main` containing Results API commit `16189fedee43b3a4f8cab7cceba8697023d81f5f` (or an equivalent descendant) |
| **Backend upgrade required for this feature** | **Yes** — for environments that do not contain `16189fed` or a descendant |
| **Breaking API changes** | **No** (`none` — additive Results endpoints under existing gradebook paths) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.13.001` — Continuous Assessment Gradebook Contract |

---

## Purpose

Documents Next.js adoption of the **Continuous Assessment Gradebook Results View**
inside the existing shared Gradebook Detail Workspace:

- Shared Entries / Results segmented view (admin + teacher)
- Role-aware Results adapter selecting admin or teacher endpoint only
- Presentation of backend aggregates, statuses, completion/missing cells
- No frontend formula recalculation, rankings, overrides, or publish actions

---

## Endpoints

Prefix: `/api/v1`

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/assessment/gradebooks/{id}/results` | Admin Results read |
| `GET` | `/teacher/assessment/gradebooks/{id}/results` | Teacher Results read (assignment-scoped) |

---

## Payload notes

- Top-level fields include `gradebook_id`, `state`, `mode`, optional `scheme_id` /
  `scheme_version`, and `students[]`.
- Each student row includes `student_line_id`, `student_id`, `cells[]`, `slots[]`,
  and `aggregate` with `status`, scores/normalized scores, and completion fields
  (`completed_cells`, `expected_cells`, `included_cells`, `missing_cells`,
  `blocking_cells`, optional `reason`).
- Aggregation statuses observed in the live contract include `available`,
  `complete`, `partial`, and `not_computable`.
- Frontend must preserve `score = 0` vs missing (`null` / unset) without falsy
  coercion, and must not invent gradebook-level averages unless returned by backend.

---

## Tenant alignment

| Tenant | Status in this phase |
|--------|----------------------|
| **school** | Already aligned (runtime verified Results API) |
| **nibras** | Not upgraded or verified |
| **alwah** | Not upgraded or verified |

---

## Relationship to prior contracts

**SSC-API-2026.13.001** remains the contract for Gradebook list/detail/entries/
lifecycle (admin + teacher UI). It is **not** superseded.

**SSC-API-2026.14.001** is **additive** and covers Results endpoints + Results
Workspace UI only.

---

## Next.js implementation map

| Area | Location |
|------|----------|
| Types | `src/types/gradebook.ts` (`GradebookResults`, cell/slot/aggregate) |
| Endpoints | `src/lib/api/endpoints.ts` (`gradebookResults` admin/teacher) |
| Role-aware adapter | `src/features/admin/gradebooks/api/gradebooks-api.ts` (`getGradebookResults`) |
| Presenters | `src/features/admin/gradebooks/utils/gradebook-results-present.ts` |
| Results view | `src/features/admin/gradebooks/components/gradebook-results-view.tsx` |
| Shared workspace | `src/features/admin/gradebooks/components/gradebook-detail-workspace.tsx` |
| Config mirror | `src/config/backend-contract.ts` (`GRADEBOOK_RESULTS_BACKEND_CONTRACT`) |
