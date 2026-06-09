# FIN-WEB-1 — Static Validation & Contract Hardening Report

**Product:** رقيم / Raqeem  
**Branch:** `feat/finance-web-1-admin-foundation`  
**Validation date:** 2026-06-09  
**Scope:** Static review, limited corrections, typecheck/build — **no push, no live QA writes**

---

## 1. Git truth (before correction commit)

| Item | Value |
|------|-------|
| Branch | `feat/finance-web-1-admin-foundation` |
| Implementation commit (on branch) | `bc1fd8bc64f752c321b308e8f3f8c4642d7991f7` (`bc1fd8b`) |
| Alternate hash in reports | `e337a22bdef858eb8eb2c794cc7533f9212bfe84` (`e337a22`) |
| Base | `cb999be6577a43fee427486a549ed75ab5fd49ef` (= `origin/main`) |
| Commits above base | 1 (`feat(finance): add admin finance workspace foundation`) |
| Uncommitted before fixes | 17 modified + 2 new files (validation hardening) |

### `bc1fd8b` vs `e337a22`

- **Same author, timestamp, message, and file stat** (32 files, +3124 lines).
- **`git merge-base --is-ancestor` fails both ways** — neither is ancestor of the other; typical of `commit --amend` rewriting hash.
- **`e337a22` is not reachable from current branch**; **`bc1fd8b` is HEAD** and is the authoritative implementation commit.
- Treat `e337a22` as a superseded amend artifact, not a second implementation.

### Working tree (pre-commit)

Modified finance/i18n files + new lookup utilities; no rebase/merge/push performed.

---

## 2. Diff scope vs base (`cb999be..bc1fd8b`)

**In scope (expected):**

- `src/app/admin/finance/**` — 10 route files
- `src/features/admin/finance/**` — forms, hub, money, status
- `src/types/finance.ts`, `src/types/permissions.ts`
- `src/lib/permissions/finance.ts`, `admin-pages.ts`
- `src/lib/utils/finance.ts`
- `src/lib/api/endpoints.ts`, `client.ts`
- `src/app/api/odoo/[...path]/route.ts` — PUT handler
- `src/components/navigation/nav-config.ts`
- `messages/{ar,en,fr,es}.json`
- `FIN_WEB_1_IMPLEMENTATION_CHECKPOINT.md`

**Out of scope:** None in the implementation commit. BFF/client changes are shared infrastructure but limited to `PUT` support required by billing profile and fee-plan updates.

---

## 3. BFF security audit

**Files:** `src/app/api/odoo/[...path]/route.ts`, `src/lib/api/client.ts`, `src/lib/api/endpoints.ts`

| Check | Result |
|-------|--------|
| PUT adds new attack surface vs GET/POST | Same `handle()` path; no extra bypass |
| Full URL from client | **No** — paths built from `endpoints` registry only |
| Odoo RPC params (`model`, `domain`, `search_read`) | **Not exposed** — REST segments only |
| Path confinement to `/api/v1` | Enforced server-side in `odooApiFetch` (existing) |
| Allowlist per route | **No route-level allowlist** — generic BFF proxy (pre-existing architecture) |
| Session cookies | httpOnly cookie injected server-side; not logged |
| `active_school_id` | Injected for `/admin/*` from session + cookie sync |
| Sensitive logging | No cookie/payload logging in route |
| HTML error handling | Delegated to `odooApiFetch` / client envelope (existing) |

**Classification:** BFF remains a **session-authenticated generic proxy** (pre-existing). PUT does not worsen it beyond enabling finance PUT endpoints already registered in `endpoints.ts`. **Not a new blocker** for FIN-WEB-1, but **not hardened** with finance-specific allowlist — document for future BFF hardening epic.

---

## 4. API contract map (UI → BFF → Odoo)

BFF prefix: browser calls `/api/odoo{path}` → Odoo `/api/v1{path}`.

| UI route | BFF call | Odoo endpoint | HTTP | Route gate | Action permission | TS type |
|----------|----------|---------------|------|------------|-------------------|---------|
| `/admin/finance` | — | — | — | `finance.view` | — | — |
| `/admin/finance/fee-types` | `GET/POST financeFeeTypes` | `/admin/finance/fee-types` | GET/POST | `finance.view` | POST: `finance.manage_fee_catalog` | `FeeType[]` / `FeeType` |
| `/admin/finance/fee-plans` | `GET financeFeePlans`, `POST` via form | `/admin/finance/fee-plans` | GET/POST | `finance.view` | POST: `finance.manage_fee_plans` | `FeePlan[]` / `FeePlan` |
| `/admin/finance/fee-plans/[id]` | `GET`, `POST …/confirm` | `/admin/finance/fee-plans/{id}`, `…/confirm` | GET/POST | `finance.view` | confirm: `finance.manage_fee_plans` | `FeePlan` |
| `/admin/finance/student-fees` | `GET students`, `GET …/fees` | `/admin/students`, `/admin/finance/students/{id}/fees` | GET | `finance.view` | — | `Student[]`, `StudentFee[]` |
| `/admin/finance/student-fees/[id]` | `GET financeStudentFees` | `/admin/finance/student-fees/{id}` | GET | `finance.view` | — | `StudentFee` |
| `/admin/finance/students/[studentId]` | `GET student`, `GET/PUT billing`, `GET/POST fees` | `/admin/students/{id}`, `…/billing-profile`, `…/fees` | GET/PUT/POST | `finance.view` | billing PUT: `finance.manage_billing_profile`; assign POST: `finance.assign_fees` | `Student`, `StudentFinanceProfile`, `StudentFee[]` |
| `/admin/finance/collections` | `GET financePaymentCollections` | `/admin/finance/payment-collections` | GET | `finance.view` | — | `PaymentCollection[]` |
| `/admin/finance/collections/new` | Blocked UI (no journals API) | `POST …/payment-collections` | POST | `finance.view` | `finance.collect_payments` (when enabled) | `PaymentCollection` |
| `/admin/finance/collections/[id]` | `GET`, `POST confirm/cancel` | `/admin/finance/payment-collections/{id}` | GET/POST | `finance.view` | confirm: `finance.collect_payments`; cancel: `finance.cancel_payments` | `PaymentCollection` |

### Contract notes

- **404 billing profile:** Handled via `not_found` → empty state + CTA (not shown as generic error on profile section).
- **Collection states:** `draft` / `confirmed` / `cancelled` mapped in `FinanceStatusBadge` + action gating.
- **Student fee states:** `open`, `partial`, `paid`, `overdue`, etc. — optional fields `balance`, `remaining_amount`, `net_amount` tolerated.
- **Currency:** `formatMoney` no longer defaults to `MAD`; uses API currency or locale number without currency code.
- **Dates:** Passed through `useFormat().formatDate` (locale-aware display).
- **Pagination:** `page`, `page_size`, `total`, `total_pages` from API meta.

---

## 5. Unconfirmed / optional fields (TypeScript)

Marked optional in `src/types/finance.ts` where live samples were incomplete:

- `Installment.id`, `Discount.id` — may be absent in nested arrays
- `PaymentAllocation.id`, nested refs
- `FeePlan.level_id`, `class_id`, date range fields
- Overview/KPI fields — **no types** (endpoint absent)
- Journal list — **no endpoint**; collection payload `journal_id` required by backend but **not user-entered**

---

## 6. Raw internal Odoo IDs — remediation

| Field | Before | After |
|-------|--------|-------|
| `academic_year_id` | Free-text filter / numeric inputs | Select from `useAcademicYearOptions()` (fee plans + class detail) |
| `journal_id` | Raw input in collection form | **Blocked** — `FINANCE_JOURNAL_LOOKUP_AVAILABLE = false`; not-ready message; hub/list actions hidden |
| `billing_partner_id` | Manual ID input | Loaded from billing profile API after student selection |
| `guardian_id` | Manual ID input | Select from `student.parents` in billing form |
| `fee_plan_id` / `fee_type_id` | Raw inputs | Select from confirmed plans / active fee types |
| Display fallbacks | Raw IDs in tables | `refName()` / dash — no raw IDs in allocation columns |

**Rule applied:** No raw internal Odoo IDs as user-facing inputs.

---

## 7. Permissions

| Permission | Enforced |
|------------|----------|
| `finance.view` | All `/admin/finance/*` via `permissionForAdminPath` + `RequireAdminPermission` + nav (`FINANCE_VIEW`) |
| `finance.manage_fee_catalog` | Fee type create |
| `finance.manage_fee_plans` | Plan create/confirm |
| `finance.assign_fees` | Assign form on student profile |
| `finance.manage_billing_profile` | Billing form |
| `finance.view_billing_profile` | `canViewBillingProfile` helper (view/manage) |
| `finance.collect_payments` | Collection confirm + create (when journals available) |
| `finance.cancel_payments` | Collection cancel |
| `finance.view_payments` | **Not** substituted for `finance.view` on routes |

403: `RequireAdminPermission` shows forbidden state (not empty list). Nav finance link requires `finance.view` only.

---

## 8. UX functional review

| Check | Status |
|-------|--------|
| No fake KPIs | Hub shows explicit “no overview API” message |
| Empty sections hidden | Installments/discounts/allocations sections conditional |
| No raw IDs in UI | Fixed in validation pass |
| Confirm plan without lines | Button hidden; message shown |
| Collection confirm/cancel by state | Gated on `draft` only |
| Submit disabled while loading | Forms use `submitting` flag |
| Double submit | Submit handlers guard on `submitting` |
| Zero/negative amount | `isPositiveAmount` validation |
| Locked collections read-only | Detail page message + no actions when not draft |
| Currency fallback | Numeric format without assuming MAD |

---

## 9. i18n

| Check | Result |
|-------|--------|
| JSON validity | ar/en/fr/es — OK |
| Key parity (`admin.finance.*`) | 146 keys × 4 langs — 0 missing |
| Hardcoded finance strings in components | Uses `useT()` |
| Arabic terminology | Uses «تلميذ» in user-facing keys |
| API names | Not translated in tables (plan/fee/student names from API) |
| New keys added in hardening | 14 keys (collection not ready, selects, confirm plan lines, etc.) |

---

## 10. Technical checks

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** (after fixing `rowKey`, `Pagination` props, duplicate import, `Student.school`) |
| `npm run build` | **PASS** — all finance routes compiled |
| `npm run lint` | **Not runnable** — project has no ESLint config; `next lint` prompts interactive setup |

---

## 11. Local static tests

No Jest/Vitest in `package.json`. Manual inline Node checks:

- `formatMoney(null)` → em dash
- `formatMoney(100, 'MAD')` → formatted currency
- `formatMoney(50)` → locale number (locale-dependent separator)
- `isPositiveAmount(0)` → false; `(0.01)` → true; `(-1)` → false

**Result:** 5/6 assertions (locale separator variance on `50` is expected).

---

## 12. Corrections applied (this validation pass)

**New files:**

- `src/lib/utils/academic-years.ts` — merge academic year options from fee plans + class
- `src/features/admin/finance/use-finance-lookups.ts` — year/plan/type hooks; journal flag

**Updated:**

- Forms: `collection-form`, `billing-profile-form`, `assign-fee-form`, `fee-plan-form`
- Pages: student profile, fee-plans list/detail, student-fees list, collections list/detail, hub links
- `src/lib/utils/finance.ts` — no MAD default; `isPositiveAmount`
- i18n: 14 new keys × 4 languages
- Typecheck fixes: `DataTable.rowKey`, `Pagination` (`total` + `onPage`), remove invalid `student.school`

**Correction commit:** `fix(finance): harden admin finance contracts and validation` — `git log -1` on this branch after `bc1fd8b`

---

## 13. Remaining blockers before Live QA

1. **Payment journal lookup API** — required to enable collection create in production UI.
2. **BFF allowlist** — generic proxy remains (pre-existing); finance paths not individually whitelisted.
3. **School-wide receivables list** — still requires student picker (API limitation).
4. **Fee plan PUT / line editing** — create-only lines in UI; full edit not in FIN-WEB-1 scope.
5. **`finance.view_payments` vs `finance.view`** — confirm backend behavior for collections list in live session.

---

## 14. Push / live operations

- **Push performed:** NO  
- **Live write operations:** NO  
- **Odoo modified:** NO  
- **Flutter modified:** NO  

---

```
Validation status: PASS WITH BLOCKERS (journals API, live QA pending)
Branch: feat/finance-web-1-admin-foundation
Base commit: cb999be6577a43fee427486a549ed75ab5fd49ef
Implementation commit: bc1fd8bc64f752c321b308e8f3f8c4642d7991f7
Correction commit: ce1a6315fff963c8e849d78b6497002c4e93eaa9
Current HEAD: ce1a6315fff963c8e849d78b6497002c4e93eaa9
BFF security: ACCEPTABLE for FIN-WEB-1 — generic proxy unchanged; PUT parity only
API contract consistency: ALIGNED with live probe; optional fields documented
Raw Odoo IDs exposed: NO (blocked or select-based)
Permission enforcement: finance.view gates routes; granular on actions
i18n validation: PASS (146 keys × 4 langs)
Typecheck: PASS
Build: PASS
Lint: NOT CONFIGURED (interactive setup required)
Local tests: PARTIAL (inline utils checks)
Live write operations: NO
Odoo modified: NO
Flutter modified: NO
Push performed: NO
Working tree: clean after correction commit
Ready for live finance QA: YES (read-heavy + catalog/plan flows; collection create blocked until journals API)
```
