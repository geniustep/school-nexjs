# SSC-API-2026.09.001 — Manual Billing Authority Change

Compatibility metadata linking **school-nexjs** `origin/main` to Odoo
`smart_school_connect` **Manual Billing Authority Change** on the student finance
workspace. Human-readable source of truth; machine-readable mirror in
`src/config/backend-contract.ts`.

**Phase:** `NEXTJS-BILLING-AUTHORITY-TARGETED-MAIN-RELEASE-1`
**Last updated:** 2026-07-07

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.09.001` |
| **Frontend release** | `school-nextjs-v2026.09.001` |
| **Required backend capability** | Manual Billing Authority Change |
| **Required backend contract** | `SSC-API-2026.09.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Reference Odoo commit** | `a485105` or any later commit containing this capability |
| **Production Server 2 HEAD (verified)** | `2b4dc28` |
| **Odoo module** | `smart_school_connect` |
| **Odoo module manifest runtime** | `18.0.1.0.166` |
| **Compatible backend** | `smart_school_connect` commit `a485105` or newer with module `18.0.1.0.166+` |
| **Backend upgrade required for this feature** | **Yes** |
| **Breaking API changes** | **No** (additive preview/apply endpoints; stable error codes) |
| **Stable HTTP error path** | `response.error.code` |
| **Prior contract** | `SSC-API-2026.08.001` |

---

## Purpose

Documents Next.js adoption of **Manual Billing Authority Change** from the
student finance overview. Admins preview financial impact server-side, review
blockers and warnings, then apply with a `preview_token`. Self-billing
(`billing_party_type: student`) requires explicit confirmation and reason.

This contract does **not** cover billing responsibility on student create,
student spotlight search, or other dev-only deltas.

---

## API surfaces

Paths below are relative to `/api/v1`. BFF/Odoo registry mirrors live in
`src/lib/api/endpoints.ts`.

### 1. Preview (GET bootstrap + POST preview)

| Item | Detail |
|------|--------|
| **Endpoint** | `POST /api/v1/admin/finance/students/{student_id}/billing-authority/change/preview` |
| **BFF path** | `endpoints.admin.financeStudentBillingAuthorityChangePreview(studentId)` |
| **GET bootstrap** | Same path — returns current authority and eligible targets |
| **Capability** | `can_change_billing_authority` or fallback `can_manage_billing_profile` |
| **Request body (POST)** | `{ billing_party_type, guardian_id?, billing_partner_id? }` |

Preview response includes `current_authority`, `new_authority`,
`financial_impact`, `affected_agreements_count`, `warnings`, `blockers`,
`can_apply`, and `preview_token`.

### 2. Apply

| Item | Detail |
|------|--------|
| **Endpoint** | `POST /api/v1/admin/finance/students/{student_id}/billing-authority/change` |
| **BFF path** | `endpoints.admin.financeStudentBillingAuthorityChange(studentId)` |
| **Request body** | `{ preview_token, reason, billing_party_type, guardian_id?, billing_partner_id?, confirmed? }` |
| **Self-billing rule** | `billing_party_type: student` requires `confirmed: true` and non-empty trimmed `reason` |

Apply must reuse the `preview_token` from the latest successful preview for the
same target selection.

---

## Stable error codes

Mapped in Next.js via `response.error.code`:

| Code |
|------|
| `billing_authority_target_invalid` |
| `billing_authority_confirmation_required` |
| `billing_authority_reason_required` |
| `billing_authority_unresolved` |
| `billing_authority_change_blocked` |
| `forbidden` |
| `unauthorized` |

---

## UI surfaces

| Surface | Path / component |
|---------|------------------|
| Student finance overview | `/admin/students/{id}` finance tab — `StudentFinanceOverviewPanel` |
| Change dialog | `BillingAuthorityChangeDialog` — preview, blockers, warnings, self-billing confirm |
| Visibility gate | `resolve-billing-authority-change-visibility` |

---

## Related files

- Config: `src/config/backend-contract.ts`
- Types: `src/types/finance-billing-authority-change.ts`
- API client: `src/features/admin/student-finance/api/billing-authority-change-api.ts`
- Payload builder: `src/features/admin/student-finance/utils/build-billing-authority-change-payload.ts`
- Preview normalizer: `src/features/admin/student-finance/utils/normalize-billing-authority-change-preview.ts`
- Error mapping: `src/features/admin/student-finance/utils/billing-authority-change-errors.ts`
- Prior contract: `docs/contracts/SSC-API-2026.08.001.md`
