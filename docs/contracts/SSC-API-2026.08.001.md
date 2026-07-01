# SSC-API-2026.08.001 — Dev Release Compatibility Contract

Compatibility metadata linking **school-nexjs** `origin/dev` (post main-sync) to
Odoo `smart_school_connect` for admissions reopen, guardian relationship detach,
and student edit surfaces introduced on dev. This document is the human-readable
source of truth; the machine-readable mirror lives in
`src/config/backend-contract.ts`.

**Phase:** `NEXTJS-DEV-SYNC-MAIN-AND-API-CONTRACT-2026-08-001-1`  
**Last updated:** 2026-07-01

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.08.001` |
| **Frontend release** | `school-nextjs-v2026.08.001` |
| **Required backend contract** | `SSC-API-2026.08.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Odoo main commit (minimum)** | `1f45edcb82a598378807901c68a9be1119dac944` or newer |
| **Odoo module** | `smart_school_connect` |
| **Odoo module version** | `18.0.1.0.154` (informational only; verified on school) |
| **Compatible backend** | `smart_school_connect` commit `1f45edcb82a598378807901c68a9be1119dac944` or newer |
| **Min Odoo version** | TBD / `null` |
| **Max Odoo version** | TBD / `null` |
| **Backend upgrade required** | **Yes** — for tenants that need admissions reopen and guardian detach actions |
| **Breaking API changes** | **No** — when the UI uses graceful fallback (see below) |
| **API prefix** | `/api/v1` |
| **Odoo touched** | No (this phase) |
| **Flutter touched** | No |
| **Prior contract** | `SSC-API-2026.07.001` (main baseline) |

---

## Purpose

This contract documents the **dev release delta** on top of the main baseline
(`SSC-API-2026.07.001`). It pins the minimum Odoo build required for new admin
surfaces shipped on `origin/dev` without claiming a full Odoo compatibility
audit or version range.

The Odoo commit is authoritative. The module version (`18.0.1.0.154`) is
**informational only** and must not be used alone to infer compatibility.

This contract does **not** change API behaviour, add runtime checks, or modify
Odoo, Flutter, BFF routes, or deployment targets.

---

## API surfaces (dev delta)

Paths below are relative to `/api/v1`. BFF/Odoo registry mirrors live in
`src/lib/api/endpoints.ts`.

### 1. Admissions reopen

| Item | Detail |
|------|--------|
| **Endpoint** | `POST /api/v1/admin/admissions/{id}/reopen` |
| **BFF path** | `endpoints.admin.admissionReopen(id)` → `/admin/admissions/{id}/reopen` |
| **Allowed action** | `allowed_actions.reopen` |
| **Request body** | `{ target_state?: string; note?: string }` |
| **UI** | `AdmissionReopenAction` / `AdmissionReopenDialog` |

**Admission detail fields consumed by dev UI:**

| Field | Role |
|-------|------|
| `rejection` | Structured rejection metadata (`is_rejected`, `reason`, `decided_at`, `decided_by`) |
| `can_reopen` | Boolean shortcut to show reopen affordance |
| `is_terminal` | Blocks student conversion when terminal |
| `can_link_student` | Gates link-student flow when `false` |
| `lost_reason` | Fallback rejection reason text |
| `state_before_close` | Context for reopen target state |

**Graceful fallback:** `canReopenAdmission()` returns `true` only when
`can_reopen === true` or `allowed_actions.reopen === true`. Otherwise
`AdmissionReopenAction` renders nothing — no hard failure on older tenants
missing these fields.

### 2. Guardian relationship detach

| Item | Detail |
|------|--------|
| **Endpoint** | `POST /api/v1/admin/students/{student_id}/guardians/{relationship_id}/remove` |
| **BFF path** | `endpoints.admin.studentGuardianRemove(studentId, relationshipId)` |
| **Allowed action** | `allowed_actions.remove_relationship` (aliases `remove_guardian_relationship` normalized in UI) |
| **Capability** | `guardians.relationship.remove` (Odoo permission; UI also gates on `can_manage_guardians`) |
| **Request body** | `{ confirm: boolean; reason?: string }` |
| **UI** | `GuardianRemoveDialog`, `GuardianRelationshipCard` remove action |

**Graceful fallback:** `canDetachGuardianRelationship()` requires
`allowed_actions.remove_relationship === true`. When absent or `false`, the
detach button is hidden — tenants without the backend action see no broken
control.

### 3. Student edit (existing endpoint, new dev UI)

| Item | Detail |
|------|--------|
| **Endpoint** | `POST /api/v1/admin/students/{id}/update` (pre-existing) |
| **BFF path** | `endpoints.admin.studentUpdate(id)` |
| **Dev UI** | Full student edit page (`student-edit-shell`, sectioned tabs) and `StudentForm` partial updates |

**Note:** The update route existed before this contract. Dev adds a dedicated
edit experience that depends on it; no new route is introduced on the Next.js
side.

---

## Graceful fallback policy

| Surface | Missing backend signal | UI behaviour |
|---------|------------------------|--------------|
| Admissions reopen | No `reopen` in `allowed_actions`, `can_reopen` not `true` | Reopen button hidden |
| Guardian detach | No `remove_relationship` in `allowed_actions` | Remove/detach button hidden |
| Student edit | Endpoint unavailable | Standard API error handling on save (page itself is route-gated by permissions) |

Tenants on older Odoo builds continue to work for unaffected flows. New actions
appear only when the backend exposes the corresponding `allowed_actions` flags.

---

## Backend compatibility

| Check | Value |
|-------|-------|
| **Compatible Odoo** | `smart_school_connect` commit `1f45edcb82a598378807901c68a9be1119dac944` or newer |
| **Module version verified on school** | `18.0.1.0.154` |
| **Backend upgrade required** | Yes, for tenants that need admissions reopen and guardian detach |
| **Breaking API changes** | No, provided UI graceful fallback is respected |
| **Odoo touched in this phase** | No |

Do **not** invent or pin additional Odoo version numbers beyond the commit and
verified module version above.

---

## Scope and limitations

- **Dev release only:** Documents `origin/dev` delta after syncing
  `origin/main` commit `d566f3b` (main baseline contract).
- **No version range yet:** `minBackendVersion` and `maxBackendVersion` remain
  `null` / TBD until a dedicated Odoo compatibility audit widens the range.
- **Tests:** Five known test failures on dev are out of scope for this contract
  phase unless directly caused by contract metadata changes.

---

## Related files

- Config: `src/config/backend-contract.ts`
- Endpoints: `src/lib/api/endpoints.ts`
- Prior baseline: `docs/contracts/SSC-API-2026.07.001.md`
- Prior release: `docs/contracts/SSC-API-2026.06.001.md`
