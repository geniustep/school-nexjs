# SSC-API-2026.10.001 — Billing Responsibility Contract (Student Create)

Compatibility metadata linking **school-nexjs** `origin/dev` to Odoo
`smart_school_connect` **Billing Responsibility Contract** on student create.
Human-readable source of truth; machine-readable mirror in
`src/config/backend-contract.ts`.

**Phase:** `NEXTJS-BILLING-RESPONSIBILITY-CONTRACT-ADOPTION-DEV-1`
**Reconciliation:** Renumbered from `SSC-API-2026.09.001` on dev to avoid semantic
collision with `SSC-API-2026.09.001` on `origin/main` (Manual Billing Authority Change).
**Last updated:** 2026-07-07

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.10.001` |
| **Frontend release** | `school-nextjs-v2026.10.001` |
| **Required backend capability** | Billing Responsibility Contract |
| **Required backend contract** | `SSC-API-2026.10.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Reference Odoo commit** | `98a80915c0494d9a52861ef3c091589abef8ff8e` |
| **Odoo module** | `smart_school_connect` |
| **Minimum confirmed backend module version** | `18.0.1.0.164` |
| **Compatible backend** | `smart_school_connect` commit `98a80915c0494d9a52861ef3c091589abef8ff8e` or newer with module `18.0.1.0.164+` |
| **Backend upgrade required for this feature** | **Yes** |
| **Breaking API changes** | **No** (additive request/response metadata; stable error codes) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.08.001` |
| **Reserved on main (different feature)** | `SSC-API-2026.09.001` — Manual Billing Authority Change |

---

## Purpose

Documents Next.js adoption of the **Billing Responsibility Contract** on
`POST /api/v1/admin/students` (student create wizard). The UI sends a single
canonical `billing_responsibility` object and maps backend failures via stable
`error.code` values — not message parsing.

This contract does **not** implement the full Prevention program (historical
obligation transitions, guardian removal finance flows, membership-centric
hardening, etc.).

---

## Request shape (canonical)

```json
{
  "billing_responsibility": {
    "mode": "guardian",
    "billing_guardian_id": 699
  }
}
```

When an existing `school.parent` is the billing guardian, send `billing_guardian_id`
with the **`school.parent` id** (not `res.partner` id). Full atomic guardian
semantics are documented in `SSC-API-2026.11.001`.

```json
{
  "billing_responsibility": {
    "mode": "student",
    "confirmed": true,
    "reason": "…"
  }
}
```

Rules:

- One source in frontend state → one payload shape.
- No silent `guardian` → `student` fallback when guardian is missing.
- Student mode requires `confirmed: true` and non-empty trimmed `reason`.

---

## Response metadata (when provided)

Student create responses may include:

| Field | Role |
|-------|------|
| `billing_responsibility.status` | `resolved` \| `unresolved` |
| `billing_responsibility.mode` | `guardian` \| `student` |
| `billing_responsibility.source` | e.g. `guardian_explicit`, `student_explicit`, `guardian_unresolved` |
| `collection_gate.collect_allowed` | When `false`, UI must not offer collection |
| `allowed_actions.collect_payment` | When `false`, UI must not offer collection |

---

## Stable error codes

Mapped in Next.js via `response.error.code`:

| Code |
|------|
| `billing_responsibility_contract_conflict` |
| `student_billing_confirmation_required` |
| `student_billing_reason_required` |
| `billing_responsibility_unresolved` |
| `billing_responsibility_existing_agreement_conflict` |
| `invalid_billing_responsibility` |
| `invalid_billing_responsibility_mode` |
| `billing_guardian_required` |
| `billing_guardian_ambiguous` |
| `billing_guardian_not_linked` |
| `billing_guardian_relationship_inactive` |

Guardian atomic onboarding codes (`guardian_identity_candidate_exists`, etc.) are
documented in `docs/contracts/SSC-API-2026.11.001.md`.

---

## UI surfaces

| Surface | Path / component |
|---------|------------------|
| Student create wizard | `/admin/students/new` — `StudentCreateForm` |
| Admission prefill entry | `/admin/students/new?admission_id=…` (same wizard; no automatic student billing) |
| Post-create routing | `student-360-shell` — blocks finance-tab redirect when unresolved |
| Collection safety | `resolve-finance-collect-block-presentation` — honors `collect_allowed` / `collect_payment` |

---

## Related files

- Config: `src/config/backend-contract.ts`
- Types: `src/types/billing-responsibility.ts`
- Payload builder: `src/features/admin/students/utils/student-create-billing-responsibility.ts`
- Error mapping: `src/features/admin/students/utils/billing-responsibility-errors.ts`
- Prior contract: `docs/contracts/SSC-API-2026.08.001.md`
