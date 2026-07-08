# SSC-API-2026.12.001 — Guardian Password Setup Contract

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Guardian password assign/reset** from admin surfaces. Human-readable source of
truth; machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-GUARDIAN-PASSWORD-SETUP-UX-IMPL-1`
**Last updated:** 2026-07-08

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.12.001` |
| **Frontend release** | `school-nextjs-v2026.12.001` |
| **Required backend capability** | Guardian account password assign/reset |
| **Required backend contract** | `SSC-API-2026.12.001` |
| **Odoo module** | `smart_school_connect` |
| **Breaking API changes** | **No** (additive fields; stable error codes) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.11.001` — Guardian Onboarding Contract |
| **Builds on** | Guardian account identity from `SSC-API-2026.11.001` |

---

## Purpose

Documents Next.js adoption of **guardian password setup** for school admins on:

- `GET /api/v1/admin/parents/{id}` — account fields `can_assign_password`, `password_was_set`, `login`, `status`
- `GET /api/v1/admin/parents/options` — `password_policy`, `allowed_parent_actions.account_assign_password`
- `POST /api/v1/admin/parents/{id}/account` — `{ password, password_confirm }`

UI surfaces (this phase):

- Parent detail `/admin/parents/{id}`
- Student 360 guardian account panel (uses guardian `school.parent` id)

Not in scope: parents list, invite email, forgot password, bulk assign.

---

## Account contract fields

| Field | Semantics |
|-------|-----------|
| `can_assign_password` | Actor may assign/reset password |
| `password_was_set` | `false` → "Set password"; `true` → "Reset password" |
| `login` | Unchanged by password POST |
| `status` | Unchanged by password POST |

Legacy payloads without these fields: Next.js normalizes safely (`password_was_set` defaults to `false`; missing `can_assign_password` hides the action).

---

## Options endpoint

`GET /api/v1/admin/parents/options`

```json
{
  "password_policy": {
    "min_length": 8,
    "requires_letter": true,
    "requires_number": true
  },
  "allowed_parent_actions": {
    "account_assign_password": true
  }
}
```

---

## Password POST

`POST /api/v1/admin/parents/{id}/account`

```json
{
  "password": "…",
  "password_confirm": "…"
}
```

Stable error codes (non-exhaustive):

- `password_required`
- `password_confirmation_mismatch`
- `password_policy_violation`
- `guardian_not_found`
- `guardian_account_identity_mismatch`

---

## Relationship to SSC-API-2026.11.001

**SSC-API-2026.11.001** remains the contract for **Guardian Onboarding** (atomic student create, `code`, `account.login`, `account.status` visibility). It is **not** superseded by this contract.

**SSC-API-2026.12.001** covers **password UX only** and reuses the guardian account identity shape from 11.001.

---

## Next.js implementation map

| Area | Location |
|------|----------|
| Password action contract | `src/features/admin/parents/utils/guardian-password-contract.ts` |
| Shared dialog | `src/features/admin/account/guardian-password-assign-dialog.tsx` |
| Shared action | `src/features/admin/account/guardian-password-assign-action.tsx` |
| API client | `src/features/admin/parents/utils/parent-account-password-api.ts` |
| Error mapping | `src/lib/account/guardian-password-errors.ts` |
| Parent detail | `src/features/admin/parents/components/parent-profile-view.tsx` |
| Student 360 | `src/features/admin/students/components/guardian-relationship-card.tsx` |

Password policy validation reuses Staff password utilities (`staff-password-utils.ts`) against `password_policy` from parents options.
