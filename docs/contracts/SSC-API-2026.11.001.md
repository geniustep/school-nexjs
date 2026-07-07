# SSC-API-2026.11.001 — Guardian Onboarding Contract (Atomic Student Create)

Compatibility metadata linking **school-nexjs** to Odoo `smart_school_connect`
**Guardian Onboarding** on atomic student create. Human-readable source of truth;
machine-readable mirror in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-MAIN-DEV-RECONCILIATION-CONTRACT-RELEASE-1`
**Last updated:** 2026-07-07

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.11.001` |
| **Frontend release** | `school-nextjs-v2026.11.001` |
| **Required backend capability** | Atomic Guardian Onboarding on student create |
| **Required backend contract** | `SSC-API-2026.11.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Reference Odoo commit** | `98a80915c0494d9a52861ef3c091589abef8ff8e` |
| **Odoo module** | `smart_school_connect` |
| **Minimum confirmed backend module version** | `18.0.1.0.164` |
| **Compatible backend** | `smart_school_connect` commit `98a80915c0494d9a52861ef3c091589abef8ff8e` or newer with module `18.0.1.0.164+` |
| **Backend upgrade required for this feature** | **Yes** |
| **Breaking API changes** | **No** (additive request/response fields; stable error codes) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.10.001` — Billing Responsibility Contract |
| **Builds on** | `SSC-API-2026.10.001` billing_responsibility semantics |

---

## Purpose

Documents Next.js adoption of **atomic guardian onboarding** on
`POST /api/v1/admin/students`. Guardians, billing responsibility, academic, and
finance metadata are submitted in **one request** inside a single backend
savepoint. The UI must **not** create the student first and link guardians in a
post-201 follow-up call.

This contract covers guardian identity visibility (`code`, `account.login`,
`account.status`) returned from create and read surfaces (Student 360 guardians
tab, parents list/detail).

---

## Request shape (canonical)

### Guardian relationships (atomic)

Existing guardian — `guardian_id` is **`school.parent` id**, not `res.partner` id:

```json
{
  "guardian_relationships": [
    {
      "guardian_id": 699,
      "relationship_type": "father",
      "is_primary_contact": true,
      "is_financial_responsible": true,
      "is_emergency_contact": true,
      "receives_notifications": true
    }
  ]
}
```

New guardian — nested `guardian` object:

```json
{
  "guardian_relationships": [
    {
      "guardian": {
        "full_name": "…",
        "phone": "…",
        "email": "…"
      },
      "relationship_type": "mother",
      "is_primary_contact": true,
      "is_financial_responsible": true,
      "is_emergency_contact": true,
      "receives_notifications": true
    }
  ]
}
```

Multi-guardian: exactly one relationship must carry `is_financial_responsible: true`
matching the selected billing guardian.

### Billing responsibility (with billing guardian id)

When mode is `guardian` and the billing guardian is an **existing** `school.parent`:

```json
{
  "billing_responsibility": {
    "mode": "guardian",
    "billing_guardian_id": 699
  }
}
```

Rules:

- `billing_guardian_id` must reference a `school.parent` id present in
  `guardian_relationships[].guardian_id` (existing) or created in the same atomic
  request (new guardian).
- Do **not** send `partner_id` where `school.parent id` is required.
- Student billing mode follows `SSC-API-2026.10.001` (`confirmed` + `reason`).

---

## Response metadata (when provided)

Student create `201` responses may include nested guardian account identity:

| Field | Role |
|-------|------|
| `guardian_relationships[].guardian.code` | Guardian public code for copy/onboarding |
| `guardian_relationships[].guardian.account.login` | Portal login when provisioned |
| `guardian_relationships[].guardian.account.status` | `active` \| `inactive` \| `no_account` |
| `guardian_relationships[].guardian.has_user_account` | Whether a portal user exists |
| `billing_responsibility` | Same semantics as `SSC-API-2026.10.001` |

Guardian read surfaces (`GET` parent/guardian detail, Student 360 guardians tab)
expose the same identity fields on guardian summaries.

---

## Guardian access user provisioning

Backend behavior required for this flow:

- New or existing guardians submitted atomically may receive (or already have) a
  portal user linked to the guardian profile.
- The UI reads provisioning outcome from `account.login`, `account.status`, and
  `has_user_account` — **not** from inferred partner fields.
- When no portal user exists, `account.status` may be `no_account` and login is
  omitted; UI shows onboarding copy without post-create link calls.
- Duplicate identity candidates return stable error code (see below) instead of
  silent partner reuse.

---

## Stable error codes

In addition to `SSC-API-2026.10.001` billing codes:

| Code | Meaning |
|------|---------|
| `billing_guardian_required` | Guardian billing selected but no guardian in payload |
| `billing_guardian_ambiguous` | Multiple guardians; billing guardian not selected |
| `billing_guardian_not_linked` | `billing_guardian_id` not in submitted relationships |
| `billing_guardian_relationship_inactive` | Selected billing guardian relationship inactive |
| `guardian_identity_candidate_exists` | New guardian identity matches existing candidate |

Mapped in Next.js via `response.error.code` (no message parsing).

---

## UI surfaces

| Surface | Path / component |
|---------|------------------|
| Student create wizard | `/admin/students/new` — atomic payload via `applyStudentCreateGuardianAtomicContractToPayload` |
| Post-create onboarding panel | `GuardianAccountOnboardingPanel` — reads create response + session handoff |
| Student 360 guardians | `/admin/students/[id]?tab=guardians` — `resolveGuardianAccountPresentation` |
| Parents list/detail | `/admin/parents` — `ParentAccountIdentityInline`, `resolveParentAccountPresentation` |

---

## Related files

- Config: `src/config/backend-contract.ts` (`GUARDIAN_ONBOARDING_BACKEND_CONTRACT`)
- Payload: `src/features/admin/students/utils/student-create-guardian-payload.ts`
- Presentation: `src/features/admin/students/utils/resolve-guardian-account-presentation.ts`
- Parents: `src/features/admin/parents/utils/resolve-parent-account-presentation.ts`
- Error mapping: `src/features/admin/students/utils/billing-responsibility-errors.ts`
- Prior contract: `docs/contracts/SSC-API-2026.10.001.md`
