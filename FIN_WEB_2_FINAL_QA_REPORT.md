# FIN-WEB-2 — Final QA, Isolation & Release Readiness Report

**Product:** رَقِيم / Raqeem  
**Date:** 2026-06-09  
**Backend:** `https://app.propanel.ma` · DB `alwah` · `smart_school_connect` 18.0.1.0.56

---

## 1. Closure status

**`BLOCKED_BY_LIVE_AUTH`** — Static validation, commit scope, and permission hardening pass. Live Admin/Parent QA could not run because all configured QA accounts return `odoo.exceptions.AccessDenied` / `invalid_credentials`. **Not ready for push** until valid credentials and live QA complete.

---

## 2. Git state

| Item | Value |
|------|-------|
| Branch | `feat/finance-web-2-parent-admin-integration` |
| HEAD (after QA fix commit) | `26f419bad51e46fe7930ac9aa45305f431e43cf6` |
| Base (`origin/main`) | `cb999be6577a43fee427486a549ed75ab5fd49ef` |
| Commits above base | 3 finance commits (linear) |

### Finance commit chain

```
cb999be (origin/main)
  └─ bc1fd8b feat(finance): add admin finance workspace foundation
       └─ ec99b69 fix(finance): harden admin finance contracts and validation
            └─ ac5b106 feat(finance): integrate parent finance and admin insights
```

No commits after `ac5b106` before this QA pass. No rebase/merge performed.

---

## 3. Local non-finance changes (preserved, not committed)

| Path | Classification | In finance commit? | Affects finance build? | Protection during QA |
|------|----------------|--------------------|-------------------------|----------------------|
| `src/app/admin-workspace.css` (Raqeem vars) | BRAND_PREEXISTING | No | No (finance uses `finance-ui.css`) | Left untouched in original tree |
| `src/app/globals.css` | BRAND_PREEXISTING | No | No | Untouched |
| `src/app/layout.tsx` | BRAND_PREEXISTING | No | No | Untouched |
| `src/app/teacher-workspace.css` | BRAND_PREEXISTING | No | No | Untouched |
| `src/components/layout/app-shell.tsx` | BRAND_PREEXISTING | No | No | Untouched |
| `src/features/auth/login-form.tsx` | BRAND_PREEXISTING | No | No | Untouched |
| `public/` | BRAND_PREEXISTING | No | No | Untouched |
| `src/components/brand/` | BRAND_PREEXISTING | No | No | Untouched |
| `src/lib/brand-assets.ts`, `fonts.ts` | BRAND_PREEXISTING | No | No | Untouched |
| `src/app/icon.svg` | BRAND_PREEXISTING | No | No (worktree build = 51 routes) | Untouched |
| `RAQEEM_BRAND_REPORT.md` | UNKNOWN_REQUIRES_REVIEW | No | No | Untouched |
| `FIN_WEB_2_INTEGRATION_REPORT.md` (local edit) | FINANCE_REQUIRED | No (doc only) | No | Optional doc update |

**No brand files entered finance commits** (`bc1fd8b` … `ac5b106`).

---

## 4. QA worktree isolation

Created clean worktree:

```txt
D:\app\school-nexjs-finance-qa
```

- Command: `git worktree add D:\app\school-nexjs-finance-qa ac5b106cad3dcf48952967ee5e8825de97cc6d99`
- HEAD: `ac5b106` (detached)
- Status: **clean** (no brand dirty files)
- `.env.local` copied read-only for QA commands (not committed)
- Original tree at `D:\app\school-nexjs` retains all brand modifications

---

## 5. Finance commit scope (`cb999be..ac5b106`)

**49 files**, +5989 / −18 lines. Scope limited to:

- Admin/parent finance routes & components
- Finance types, utilities, permissions, endpoints
- BFF: `PUT` on existing proxy only (`route.ts` +5 lines)
- i18n finance namespaces
- Finance reports & test/probe scripts

**No brand/logo/styling commits in finance history.**

---

## 6. API contract map (code ↔ endpoints)

| Page | BFF | Odoo | Method | Permission / role | Type |
|------|-----|------|--------|-------------------|------|
| `/admin/finance` | `/api/odoo/admin/finance/overview` | `/admin/finance/overview` | GET | `finance.view` | `AdminFinanceOverview` |
| `/admin/finance/student-fees` | `…/students/search` | same | GET | `finance.view_student_balance` | `FinanceStudentSearchResult[]` |
| `/admin/finance/student-fees/[id]` | `…/student-fees/{id}` | same | GET | `finance.view` | `StudentFee` |
| `/admin/finance/collections` | `…/payment-collections` | same | GET | `finance.view_payments` | `PaymentCollection[]` |
| `/admin/finance/collections/new` | `reference-data`, `eligible-billing-partners`, POST collections | same | GET/POST | `finance.view_payments` + `finance.collect_payments` | `FinanceReferenceData`, `EligibleBillingPartner[]`, `PaymentCollection` |
| `/admin/finance/collections/[id]` | GET + confirm/cancel | same | GET/POST | view: `finance.view_payments`; actions: collect/cancel | `PaymentCollection` |
| `/parent/finance` | `/api/odoo/parent/finance` | same | GET | `role=parent` | `ParentFinanceOverview` |
| `/parent/children/{id}/finance` | `…/children/{id}/finance` | same | GET | parent + child scope | `ParentChildFinanceDetails` |
| `/parent/children/{id}/finance/fees/{feeId}` | `…/fees/{feeId}` | same | GET | parent | `StudentFee` |
| `/parent/children/{id}/finance/collections*` | collections endpoints | same | GET | parent | `ParentFinanceCollection` |

Envelopes normalized via `parseFinanceList()` / `normalizePagination()` / `normalizeMoneyValue()`.

Journal errors mapped: `invalid_journal`, `journal_inactive`, `journal_not_allowed`, `journal_company_mismatch`.

---

## 7. BFF security

Reviewed `src/app/api/odoo/[...path]/route.ts`, `client.ts`, `endpoints.ts`.

| Check | Result |
|-------|--------|
| Full URL from client | No — paths from `endpoints` registry only |
| Odoo RPC params | Not exposed |
| Cookie/secrets logged | No |
| Session injection | httpOnly `scc_session` server-side |
| `active_school_id` | Injected for `/admin/*` from session |
| HTML errors | JSON envelope via `odooApiFetch` |
| Generic proxy | **Known constraint** — no route allowlist; frontend does not build paths from user input |

---

## 8. Permission validation (static + fix applied)

| Area | Expected | Implementation (after QA fix) |
|------|----------|-------------------------------|
| Finance nav | `finance.view` | ✓ `nav-config` |
| Overview | `finance.view` | ✓ |
| Student search | `finance.view_student_balance` | ✓ tightened (no `finance.view` fallback) |
| Collections list/detail | `finance.view_payments` | ✓ **fixed in QA pass** |
| Record collection | `finance.collect_payments` | ✓ |
| Cancel collection | `finance.cancel_payments` | ✓ action gate |
| Parent routes | `role=parent` | ✓ `parent/layout.tsx` |
| 403 vs empty | Forbidden state | ✓ `RequireAdminPermission` / `PermissionDeniedState` |

---

## 9. Technical checks (QA worktree `ac5b106`)

| Command | Result |
|---------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — **51 routes** (no brand `icon.svg`; finance routes present) |
| `node scripts/finance-web-2-tests.mjs` | PASS |
| `npm run lint` | NOT CONFIGURED (interactive ESLint) |

Original tree build with brand assets: **52 routes** (includes `/icon.svg`).

---

## 10. i18n

- `admin.finance.*` + `parent.finance.*`: **213 keys × 4 langs**, 0 missing
- JSON valid in ar/en/fr/es
- Arabic uses «تلميذ» in admin strings
- RTL via existing `dir` on `<html>` (static review; live visual QA blocked)

---

## 11. Authentication diagnosis

Script: `scripts/finance-auth-diagnosis.mjs`

### Odoo direct (`POST /web/session/authenticate`)

| Account | Password env | uid | Cookie | Error |
|---------|--------------|-----|--------|-------|
| `qa.schoolmgr` | `ODOO_QA_RBAC_PASSWORD` | null | no | `odoo.exceptions.AccessDenied` |
| `qa.staff` | `ODOO_QA_RBAC_PASSWORD` | null | no | `odoo.exceptions.AccessDenied` |
| `qa.parent` | `ODOO_QA_PARENT_PASSWORD` | null | no | `odoo.exceptions.AccessDenied` |

**Root cause:** Credentials in `.env.local` are rejected by Odoo (`AccessDenied`), not a Next.js session bug. Previous probe failure (`uid undefined`) was misdiagnosed as missing cookie — cookie is absent because authentication failed.

### Next BFF (`POST /api/auth/login`)

All accounts: `401 invalid_credentials` (no `scc_session`). Dev server was not required for diagnosis; BFF mirrors Odoo rejection.

**No passwords changed. No Backend changes.**

---

## 12. Live Admin QA

**NOT EXECUTED** — blocked by authentication.

Planned checklist (pending valid credentials):

1. Login → Finance nav  
2. Overview + filters  
3. Student search + pagination  
4. Student profile / fee detail / installments / discounts  
5. Collections list/detail  
6. Reference-data / journal-empty  
7. Draft collection (if safe QA journal)  
8. 403 for unauthorized role  

---

## 13. Live Parent QA

**NOT EXECUTED** — blocked by authentication.

Planned: parent finance overview, multi-child, fee/collection detail, read-only verification, unowned student 404.

---

## 14. Journal-empty behavior (static)

When `reference-data` returns no journals:

- Collection form shows `noPaymentJournalDesc`
- Submit disabled; hub/list “record collection” hidden
- **Correct by design** — not a failure

---

## 15. QA corrections (this pass)

**Commit:** `fix(finance): finalize web finance QA and session handling`

Changes:

1. Collections routes gated on `finance.view_payments` (list, detail, new page wrapper)
2. Student balance search: `canViewStudentBalance` requires `finance.view_student_balance` only
3. Added `canViewPayments()` helper
4. Added `scripts/finance-auth-diagnosis.mjs` for repeatable auth diagnosis

No brand/Odoo/Flutter changes.

---

## 16. Release readiness decision

| Criterion | Status |
|-----------|--------|
| Finance commits clean | ✓ |
| Brand isolated | ✓ |
| typecheck/build/tests | ✓ |
| Live Admin QA | ✗ BLOCKED |
| Live Parent QA | ✗ BLOCKED |
| Permissions hardened | ✓ (QA fix) |
| Push | **NO** |

---

## 17. Push

**Not performed.**

---

```
Closure status: BLOCKED_BY_LIVE_AUTH
Branch: feat/finance-web-2-parent-admin-integration
Base commit: cb999be6577a43fee427486a549ed75ab5fd49ef
FIN-WEB-1 implementation commit: bc1fd8bc64f752c321b308e8f3f8c4642d7991f7
FIN-WEB-1 correction commit: ec99b690e3b0f814748936fa42288ab69b4ef9f0
FIN-WEB-2 commit: ac5b106cad3dcf48952967ee5e8825de97cc6d99
QA/fix commit: 26f419bad51e46fe7930ac9aa45305f431e43cf6
Current HEAD: 26f419bad51e46fe7930ac9aa45305f431e43cf6
Finance commit scope: CLEAN — 49 files, finance-only
Brand local changes preserved: YES — untouched in original tree
QA worktree: D:\app\school-nexjs-finance-qa @ ac5b106 clean
API contract validation: PASS (static + normalizers)
BFF security: ACCEPTABLE — generic proxy unchanged
Permission validation: PASS after QA fix
Typecheck: PASS
Build: PASS (52 routes in main tree with brand icon; 51 in QA worktree at ac5b106)
Lint: NOT CONFIGURED
Local tests: PASS
Admin authentication: FAIL — AccessDenied all QA accounts
Parent authentication: FAIL — AccessDenied
Admin live QA: NOT RUN
Parent live QA: NOT RUN
Journal-empty behavior: PASS (static)
Collection draft QA: NOT RUN
RTL/LTR QA: NOT RUN (static i18n only)
Odoo modified: NO
Flutter modified: NO
Push performed: NO
Original working tree: dirty — brand files preserved
QA working tree: clean
Ready for push: NO
Blocking issues: BLOCKED_BY_LIVE_AUTH — refresh QA passwords in .env.local; rerun finance-auth-diagnosis.mjs; complete live Admin/Parent QA
```
