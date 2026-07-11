# SSC-API-2026.13.001 — Continuous Assessment Gradebook Contract

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Continuous Assessment Gradebook** admin (and teacher adapter) APIs. Human-readable
source of truth; machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-TEACHER-GRADEBOOK-MAIN-RELEASE-BRANCH-1`
**Last updated:** 2026-07-11

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.13.001` |
| **Frontend release** | `school-nextjs-v2026.13.001` |
| **Required backend capability** | Continuous assessment gradebook list/detail/create, entries batch update, lifecycle actions |
| **Required backend contract** | `SSC-API-2026.13.001` |
| **Odoo module** | `smart_school_connect` |
| **Reference Odoo commits** | Gradebook API `012b4a98c9c9f64589a986a21d8665c49bdc9e68`; create hotfix `b2569736c78337b28260fd9682a93262ce4e4935` (API commit is an ancestor of the hotfix on Odoo `main`) |
| **Minimum confirmed backend module version** | *Not asserted in this contract* (commit-based requirement only) |
| **Compatible backend** | Odoo `smart_school_connect` on `main` containing create hotfix `b2569736c78337b28260fd9682a93262ce4e4935` (implies Gradebook API `012b4a98…`) |
| **Backend upgrade required for this feature** | **Yes** — Odoo `main` must include the Gradebook API + create hotfix commits above |
| **Breaking API changes** | **No** (`none` — additive Gradebook endpoints; no change to prior admin APIs) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.12.001` — Guardian Password Setup Contract |

---

## Purpose

Documents Next.js adoption of the **Continuous Assessment Gradebook Workspace**:

- Admin list + create + detail workspace (simple and composite grids)
- Batch score/participation entry updates
- Lifecycle actions (build/sync roster, open, submit, validate, publish, lock)
- Teacher Gradebook UI shell (list + detail) reusing the shared workspace with role-scoped actions (`edit_entries`, `submit`)
- Teacher API adapters under `/teacher/assessment/gradebooks`

Backend API requirements are unchanged from the admin Gradebook release; this frontend release adds Teacher UI only.

---

## Endpoints (admin)

Prefix: `/api/v1`

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/assessment/gradebooks` | List |
| `POST` | `/admin/assessment/gradebooks` | Create |
| `GET` | `/admin/assessment/gradebooks/{id}` | Detail (context, roster, structure, matrix/entries, completion, allowed actions) |
| `PATCH` | `/admin/assessment/gradebooks/{id}/entries` | Batch entry update |
| `POST` | `/admin/assessment/gradebooks/{id}/build-roster` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/sync-roster` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/open` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/submit` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/validate` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/publish` | Lifecycle |
| `POST` | `/admin/assessment/gradebooks/{id}/lock` | Lifecycle |

Teacher endpoints (UI + adapters): `/teacher/assessment/gradebooks` (+ `{id}`, `{id}/entries`, `{id}/submit`).

---

## Payload notes

- Detail responses may nest matrix data as `matrix.entries` with slot/cell `id`/`name` shapes; Next.js normalizes to a flat editable matrix for the workspace.
- Create requires a backend that includes the create hotfix (`b256973…`); older API-only tips without the hotfix are insufficient for create.

---

## Relationship to prior contracts

**SSC-API-2026.12.001** and earlier contracts remain in force for their domains. This contract is **additive** and does not supersede guardian, billing, or finance contracts.

---

## Next.js implementation map

| Area | Location |
|------|----------|
| Types | `src/types/gradebook.ts` |
| Endpoints | `src/lib/api/endpoints.ts` |
| API adapters | `src/features/admin/gradebooks/api/gradebooks-api.ts` |
| Normalize | `src/features/admin/gradebooks/utils/gradebook-normalize.ts` |
| List / create | `src/features/admin/gradebooks/components/gradebooks-list-page.tsx` |
| Detail workspace (shared admin/teacher) | `src/features/admin/gradebooks/components/gradebook-detail-workspace.tsx` |
| Admin routes | `src/app/admin/academics/assessment/gradebooks/` |
| Teacher list / present | `src/features/teacher/gradebooks/` |
| Teacher routes | `src/app/teacher/assessment/gradebooks/` |
