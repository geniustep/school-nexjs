# FIN-WEB-1 — Implementation Checkpoint (not closure)

**Product:** رقيم / Raqeem  
**Branch:** `feat/finance-web-1-admin-foundation`  
**Base commit:** `cb999be6577a43fee427486a549ed75ab5fd49ef`  
**API source:** Live probe against `https://app.propanel.ma` (DB `alwah`) — `admin_finance.py` not available locally.

---

## 1. Endpoints actually used

| Method | Endpoint | Permission (from `/me`) | Notes |
|--------|----------|-------------------------|-------|
| GET | `/admin/finance/fee-types` | `finance.view` | `page`, `page_size`, `search`, `active` |
| POST | `/admin/finance/fee-types` | `finance.manage_fee_catalog` | Requires `name`, `code` |
| GET | `/admin/finance/fee-plans` | `finance.view` | `page`, `page_size`, `academic_year_id`, `state` |
| POST | `/admin/finance/fee-plans` | `finance.manage_fee_plans` | `school_id`, `name`, `code`, `academic_year_id`, optional `lines` |
| GET | `/admin/finance/fee-plans/{id}` | `finance.view` | Includes `lines` |
| PUT | `/admin/finance/fee-plans/{id}` | `finance.manage_fee_plans` | Update plan (incl. lines on create) |
| POST | `/admin/finance/fee-plans/{id}/confirm` | `finance.manage_fee_plans` | Requires non-empty lines |
| GET | `/admin/finance/students/{student_id}/fees` | `finance.view` | Per-student list; `status`, `overdue_only`, `academic_year_id` |
| GET | `/admin/finance/student-fees/{id}` | `finance.view` | Detail (installments/discounts when present) |
| POST | `/admin/finance/students/{student_id}/fees` | `finance.assign_fees` | `fee_plan_id`, optional `academic_year_id` |
| GET | `/admin/finance/students/{student_id}/billing-profile` | `finance.view_billing_profile` | 404 `not_found` when missing |
| PUT | `/admin/finance/students/{student_id}/billing-profile` | `finance.manage_billing_profile` | Partner fields per backend rules |
| GET | `/admin/finance/payment-collections` | `finance.view` / `finance.view_payments` | `search`, `status`, `student_id`, `date_from`, `date_to` |
| GET | `/admin/finance/payment-collections/{id}` | `finance.view` | Detail + allocations when present |
| POST | `/admin/finance/payment-collections` | `finance.collect_payments` | `student_id`, `academic_year_id`, `journal_id`, `billing_partner_id`, `amount`, `payment_method`, `collection_date`, optional `allocations` |
| POST | `/admin/finance/payment-collections/{id}/confirm` | `finance.collect_payments` | Draft → confirmed |
| POST | `/admin/finance/payment-collections/{id}/cancel` | `finance.cancel_payments` | Draft cancel |

**Not available (404 / no route):** `/admin/finance/overview`, global `/admin/finance/student-fees`, discounts CRUD/list, standalone installments list, fee-type detail/update by id, journals lookup, academic-years lookup.

---

## 2. Routes added

| Path | Purpose |
|------|---------|
| `/admin/finance` | Finance hub (no KPI API) |
| `/admin/finance/fee-types` | Fee catalog list + create |
| `/admin/finance/fee-plans` | Fee plans list + create |
| `/admin/finance/fee-plans/[id]` | Plan detail + confirm |
| `/admin/finance/student-fees` | Receivables (student picker → per-student API) |
| `/admin/finance/student-fees/[id]` | Receivable detail |
| `/admin/finance/students/[studentId]` | Student finance profile |
| `/admin/finance/collections` | Payment collections list |
| `/admin/finance/collections/new` | Record collection |
| `/admin/finance/collections/[id]` | Collection detail (read-only when locked) |

---

## 3. BFF

- Reuses generic `/api/odoo/[...path]` proxy (session cookie + `active_school_id` for `/admin/*`).
- **Added:** `PUT` handler on BFF route for billing profile and fee plan updates.
- **Added:** `api.put()` on client.
- No new public proxy surface; no model/domain passthrough.

---

## 4. TypeScript types

`src/types/finance.ts`: `FeeType`, `FeePlan`, `FeePlanLine`, `StudentFee`, `Installment`, `Discount`, `PaymentCollection`, `PaymentAllocation`, `StudentFinanceProfile`, create/update payloads.

`src/types/permissions.ts`: finance.* capability keys from live `/me`.

---

## 5. Permissions enforced

| Capability | UI / route |
|------------|------------|
| `finance.view` | Nav entry, all finance routes (server guard via `permissionForAdminPath`) |
| `finance.manage_fee_catalog` | Create fee type |
| `finance.manage_fee_plans` | Create/confirm fee plans |
| `finance.assign_fees` | Assign plan on student profile |
| `finance.manage_billing_profile` | Billing profile form |
| `finance.view_billing_profile` | Billing profile read |
| `finance.collect_payments` | Record + confirm collection |
| `finance.cancel_payments` | Cancel draft collection |
| `finance.manage_discounts` | **Not wired** — no discounts API |

403 → `PermissionDeniedState` / `ApiErrorView` (not empty state).

---

## 6. Translation namespace

`admin.finance.*` + `nav.finance`, `nav.financeSection` in `messages/{ar,en,fr,es}.json`.

---

## 7. Implemented behaviour

- Single **المالية / Finance** nav item → hub with permission-filtered quick links.
- Hub shows active school; explicit notice that overview KPIs are unavailable from API.
- Fee types/plans read + create; plan confirm when draft.
- Student receivables via **student selection** (no fake global list).
- Student finance profile: summary, billing (404 → empty), fees table, assign/billing forms.
- Collections list with API filters; detail with confirm/cancel; read-only when confirmed/cancelled.
- Collection create form with backend-required fields only; amount validation client-side.
- RTL + i18n (ar/en/fr/es); money formatting via `Intl` + API currency.

---

## 8. Not implemented (missing API)

- Finance dashboard KPIs / overview.
- School-wide student-fees list.
- Discounts management UI.
- Dedicated installments index.
- Fee type edit/archive/detail by id.
- Journals / academic years pickers (IDs entered manually).
- Payment reversal (`/reverse` → 404).

---

## 9. Files touched

**New:** `src/types/finance.ts`, `src/lib/permissions/finance.ts`, `src/lib/utils/finance.ts`, `src/features/admin/finance/*`, `src/app/admin/finance/**`

**Updated:** `src/lib/api/endpoints.ts`, `src/lib/api/client.ts`, `src/app/api/odoo/[...path]/route.ts`, `src/types/permissions.ts`, `src/lib/permissions/admin-pages.ts`, `src/components/navigation/nav-config.ts`, `messages/{ar,en,fr,es}.json`

---

## 10. Known constraints

- QA accounts on `alwah` may lack `finance.*` permissions (e.g. `qa.pm`); admin `done` has full finance caps.
- Billing profile creation depends on valid `billing_partner_id` / `guardian_id` from Odoo — no lookup endpoint exposed.
- `journal_id` required for collections — no journals list API in v1 probe.
- Student fee detail/installment shapes typed with optional fields; live sample with data not available on school 10 during probe.

---

## 11. Next-phase tests (not run here)

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] Live QA with finance-enabled admin on `alwah`
- [ ] E2E: fee plan confirm → assign → collection draft → confirm
- [ ] RBAC: user without `finance.view` blocked on `/admin/finance`
- [ ] 403 vs empty on billing profile missing

---

## 12. Confirmation

- Odoo modified: **NO**
- Flutter modified: **NO**
- Build executed: **NO**
- Typecheck executed: **NO**
- Live QA executed: **NO** (probe only during dev)
- Push executed: **NO**

---

Implementation status:  
Branch: `feat/finance-web-1-admin-foundation`  
Base commit: `cb999be6577a43fee427486a549ed75ab5fd49ef`  
Local commit: `e337a22bdef858eb8eb2c794cc7533f9212bfe84`  
Finance routes: 10 pages under `/admin/finance/*`  
BFF routes: generic `/api/odoo/*` + new PUT  
API contracts reused: 16 finance endpoints (see §1)  
Permissions enforced: `finance.view` + granular finance.* for actions  
Translations: `admin.finance` + nav keys (ar/en/fr/es)  
Odoo modified: NO  
Flutter modified: NO  
Build executed: NO  
Typecheck executed: NO  
Live QA executed: NO  
Push executed: NO  
Working tree: clean
