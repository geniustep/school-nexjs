# FIN-WEB-2 — Parent Finance & Admin Integration Report

**Product:** رَقِيم / Raqeem  
**Branch:** `feat/finance-web-2-parent-admin-integration`  
**Base:** `ec99b690e3b0f814748936fa42288ab69b4ef9f0` (FIN-WEB-1 correction)  
**Date:** 2026-06-09

---

## 1. Git lineage

| Commit | Role |
|--------|------|
| `bc1fd8bc64f752c321b308e8f3f8c4642d7991f7` | FIN-WEB-1 implementation |
| `ec99b690e3b0f814748936fa42288ab69b4ef9f0` | FIN-WEB-1 static hardening |
| *(this branch)* | FIN-WEB-2 integration |

Branch created from `ec99b69`. Unrelated working-tree changes (brand/assets) were **not** included in the FIN-WEB-2 commit.

---

## 2. Endpoints used

| Page | BFF | Odoo | Method | Gate |
|------|-----|------|--------|------|
| `/admin/finance` | `financeOverview` | `/admin/finance/overview` | GET | `finance.view` |
| `/admin/finance/student-fees` | `financeStudentsSearch` | `/admin/finance/students/search` | GET | `finance.view` + `finance.view_student_balance` |
| `/admin/finance/collections/new` | `financeReferenceData`, `financeEligibleBillingPartners`, POST collections | `/admin/finance/reference-data`, `…/eligible-billing-partners`, `/admin/finance/payment-collections` | GET/POST | `finance.collect_payments` |
| `/admin/finance/student-fees/[id]` | `financeStudentFees` | `/admin/finance/student-fees/{id}` | GET | `finance.view` |
| `/parent/finance` | `parent.finance` | `/parent/finance` | GET | `role=parent` |
| `/parent/children/{id}/finance` | `childFinance` | `/parent/children/{id}/finance` | GET | parent + child scope |
| `/parent/children/{id}/finance/fees/{feeId}` | `childFinanceFee` | `…/finance/fees/{feeId}` | GET | parent |
| `/parent/children/{id}/finance/collections*` | `childFinanceCollections` | `…/finance/collections` | GET | parent |

Also registered (available for lookups): `financePaymentJournals`, `financeAcademicYears`.

**BFF:** No new proxy routes. Existing `/api/odoo/[...path]` only.

**Eligible billing partners path:** `/admin/finance/students/{studentId}/eligible-billing-partners`

---

## 3. TypeScript

Extended `src/types/finance.ts` with:

- `AdminFinanceOverview`, `FinanceOverviewTotals`, `FinanceFollowupStudent`
- `FinanceStudentSearchResult`, `FinanceReferenceData`, `PaymentJournal`, `AcademicYearReference`
- `EligibleBillingPartner`, `ParentFinanceOverview`, `ParentFinanceChildSummary`, `ParentChildFinanceDetails`, `ParentFinanceCollection`
- `FinanceInstallment`, `FinanceDiscount` (aliases kept for FIN-WEB-1)

Normalizers in `src/lib/utils/finance-normalize.ts` handle `items`/`children` envelopes and string amounts.

---

## 4. Admin overview

`/admin/finance` loads real KPIs from overview API with filters:

- `academic_year_id`, `date_from`, `date_to`
- Metrics shown only when API returns values (no fake zeros)
- Recent collections + follow-up students tables when present

---

## 5. Student search

Replaced raw student ID picker with finance search table:

- Filters: `search`, `has_balance`, `overdue_only`, pagination
- Columns: name, code, class, level, school, due/paid/remaining/overdue
- Row click → `/admin/finance/students/{id}`

---

## 6. Installments & discounts

`/admin/finance/student-fees/[id]` shows full installment table (amounts, status, overdue flag) and discounts (type, value, reason, status, date). Sections hidden when empty.

---

## 7. Reference data & collection form

Collection form uses `reference-data` for journals and academic years:

- Journal select (name/code/type/currency)
- Auto-select `is_current` academic year
- Payment methods from journal `allowed_payment_methods`
- Billing partners from `eligible-billing-partners` (no raw IDs)
- Empty journals → disabled form + clear message
- Journal validation error codes mapped to i18n

---

## 8. Parent finance

Routes:

- `/parent/finance` — children summary cards
- `/parent/children/{id}/finance` — child detail, fees, recent collections
- `/parent/children/{id}/finance/fees/{feeId}`
- `/parent/children/{id}/finance/collections`
- `/parent/children/{id}/finance/collections/{collectionId}`

Read-only: no write actions, no journal IDs, no admin notes.

Navigation: parent sidebar + child subnav «المالية».

---

## 9. Parent isolation

Access enforced by:

- `requireRole('parent')` in parent layout
- Parent API endpoints scoped server-side
- 404/403 from API surfaced via `ResourceView` (no existence leak in UI copy)

---

## 10. Permissions

- Routes: `finance.view` via `permissionForAdminPath`
- Student search: `canViewStudentBalance` (`finance.view` OR `finance.view_student_balance`)
- Collection create: `finance.collect_payments` + journals available
- Parent: role-only (no admin finance capabilities)

---

## 11. i18n

Added `admin.finance.*` keys (overview, journals, errors) and new `parent.finance.*` namespace in ar/en/fr/es (146+ admin keys parity maintained; 40 parent keys × 4 langs).

Arabic uses «تلميذ» in admin strings; API names not translated.

---

## 12. Files (FIN-WEB-2 scope)

**New:** overview panel, student search, parent finance pages, `finance-normalize.ts`, probe/test scripts  
**Updated:** types, endpoints, permissions, collection form, lookups, hub links, student-fees pages, nav, child-subnav, messages, admin-workspace finance CSS

---

## 13. Tests

`node scripts/finance-web-2-tests.mjs` — PASS (money, amounts, overdue, list parsing, journal errors)

---

## 14. Technical checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS (52 routes incl. 6 parent finance) |
| `npm run lint` | NOT CONFIGURED (interactive ESLint setup) |

---

## 15. Live QA (alwah)

Attempted read-only probe via `scripts/finance-web-2-probe.mjs`.

**Blocker:** Odoo direct authenticate returned no session (`uid undefined`) with configured credentials — live QA not completed.

No write operations attempted. No Odoo/Flutter changes.

---

## 16. Remaining constraints

- Live validation of response field shapes pending QA credentials/session
- BFF remains generic proxy (unchanged from FIN-WEB-1)
- Electronic payment / CMI out of scope
- Discount write APIs not exposed

---

## 17. Push

**Push performed:** NO

---

```
Implementation status: COMPLETE (pending live QA)
Branch: feat/finance-web-2-parent-admin-integration
Base commit: ec99b690e3b0f814748936fa42288ab69b4ef9f0
FIN-WEB-1 implementation commit: bc1fd8bc64f752c321b308e8f3f8c4642d7991f7
FIN-WEB-1 correction commit: ec99b690e3b0f814748936fa42288ab69b4ef9f0
FIN-WEB-2 commit: (see git log -1 on branch)
Current HEAD: (see git rev-parse HEAD)
Admin overview: INTEGRATED
Admin student search: INTEGRATED
Installments integrated: YES
Discounts integrated: YES
Reference data integrated: YES
Collection form enabled: YES (when journals in reference-data)
Journal-empty behavior: DISABLE + MESSAGE
Parent finance overview: YES
Parent child finance detail: YES
Parent fee detail: YES
Parent collections: YES
Parent isolation: API + layout role
Permissions: GRANULAR ADMIN + PARENT ROLE
Translations: ar/en/fr/es
BFF security: UNCHANGED GENERIC PROXY
Typecheck: PASS
Build: PASS
Lint: NOT CONFIGURED
Local tests: PASS (finance-web-2-tests.mjs)
Live admin QA: BLOCKED (auth)
Live parent QA: BLOCKED (auth)
Odoo modified: NO
Flutter modified: NO
Push performed: NO
Working tree: see git status (brand files may remain unstaged)
Ready for final finance web QA: YES (after live credentials)
```
