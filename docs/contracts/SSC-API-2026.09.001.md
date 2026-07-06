# SSC-API-2026.09.001 — Billing Responsibility Contract (Student Create)

Compatibility metadata linking **school-nexjs** `origin/dev` to Odoo
`smart_school_connect` **Billing Responsibility Contract** on student create.
Human-readable source of truth; machine-readable mirror in
`src/config/backend-contract.ts`.

**Phase:** `NEXTJS-BILLING-RESPONSIBILITY-CONTRACT-ADOPTION-DEV-1`  
**Last updated:** 2026-07-06

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.09.001` |
| **Frontend release** | `school-nextjs-v2026.09.001` |
| **Required backend capability** | Billing Responsibility Contract |
| **Required backend contract** | `SSC-API-2026.09.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Reference Odoo commit** | `98a80915c0494d9a52861ef3c091589abef8ff8e` |
| **Odoo module** | `smart_school_connect` |
| **Minimum confirmed backend module version** | `18.0.1.0.164` |
| **Compatible backend** | `smart_school_connect` commit `98a80915c0494d9a52861ef3c091589abef8ff8e` or newer with module `18.0.1.0.164+` |
| **Backend upgrade required for this feature** | **Yes** |
| **Breaking API changes** | **No** (additive request/response metadata; stable error codes) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.08.001` |

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
    "mode": "guardian"
  }
}
```

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
