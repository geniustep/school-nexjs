# FIN-WEB-2 — Final Live QA & Release Decision

**Date:** 2026-06-09  
**Backend:** `https://app.propanel.ma` · DB `alwah` · module `18.0.1.0.56`

---

## 1. Closure status

**`BLOCKED_BY_PARENT_CREDENTIAL`**

Admin live QA (`qa.pm`, `done`) **PASS**. Parent account `qa.parent` rejects credentials (`AccessDenied` / `invalid_credentials`). **Not ready for push** until parent password is corrected in `.env.local` and parent routes are verified live.

---

## 2. Git & secrets

| Check | Result |
|-------|--------|
| Branch | `feat/finance-web-2-parent-admin-integration` |
| Initial HEAD | `a68dce7e88c7d9de7ed520da7d230f7a9a19c442` |
| `.env` gitignored | YES (`.gitignore:24:.env`) |
| `.env.local` gitignored | YES (`.gitignore:23:.env*.local`) |
| `git ls-files .env*` | empty |
| Secrets in commits | NO |
| Brand local changes | preserved, not staged |

---

## 3. QA worktree & build

| Item | Value |
|------|-------|
| Worktree | `D:\app\school-nexjs-finance-qa` |
| Worktree HEAD (baseline build) | `a68dce7` (clean) |
| Live QA dev server | main tree @ fixes, port **3012** |
| Baseline worktree port | **3011** (pre-fix smoke) |

| Command (worktree @ a68dce7) | Result |
|------------------------------|--------|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS (51 routes, no brand icon) |
| `node scripts/finance-web-2-tests.mjs` | PASS |

| Command (main tree post-fix) | Result |
|------------------------------|--------|
| `npm run typecheck` | PASS |
| `npm run build` | PASS (52 routes with brand icon) |
| `node scripts/finance-web-2-tests.mjs` | PASS |

---

## 4. Authentication (`finance-auth-diagnosis.mjs`)

### qa.pm

| Check | Result |
|-------|--------|
| Odoo direct login | PASS · uid 66 |
| BFF login | PASS · `scc_session` |
| `/me` role | `admin` / `project_manager` |
| Finance perms | `finance.view`, `finance.view_student_balance` (+ catalog/plan caps) |
| No payment perms | confirmed (no `view_payments`, `collect_payments`) |

### done

| Check | Result |
|-------|--------|
| Odoo + BFF login | PASS · uid 2 |
| Payment perms | `finance.view_payments`, `finance.collect_payments` |
| Overview proxy | 200 |

### qa.parent

| Check | Result |
|-------|--------|
| Odoo direct | FAIL · `AccessDenied` |
| BFF | FAIL · `invalid_credentials` |
| Blocker | `ODOO_QA_PARENT_PASSWORD` not valid for `alwah` |

`qa.schoolmgr` / `qa.staff` not in scope (different DB passwords).

---

## 5. qa.pm live QA (BFF `localhost:3012`)

| Area | Result |
|------|--------|
| Overview KPIs | 200 · real API data |
| Overview date filters | 200 with `date_from` / `date_to` |
| Student search | 200 · FINQA student (1 row) |
| Overdue filter | 200 |
| Student fees list | 200 · student 101 |
| Billing profile | 200 |
| Fee detail | 200 · **2 installments**, 0 discounts |
| reference-data | **403 forbidden** (expected RBAC) |
| payment-collections | **403 forbidden** (expected RBAC) |
| Hub collections link | hidden after fix (`canViewPayments`) |
| Record collection CTA | hidden (no `collect_payments`) |

**Fix applied:** Finance student profile no longer blocked when `/admin/students/{id}` returns 403 — falls back to finance fees/billing endpoints (qa.pm path).

---

## 6. done live QA

| Area | Result |
|------|--------|
| Collections list | 200 · 0 rows |
| reference-data | 200 |
| Academic years | present |
| Currency | MAD |
| **payment_journals** | **[] (empty)** |
| Journal-empty UI | form shows `noPaymentJournalDesc`, no POST attempted |
| Draft collection | **skipped** (no journals — correct QA outcome) |

---

## 7. Parent QA

**NOT EXECUTED** — authentication blocked.

Required after credential fix:

- `/parent/finance`
- Child finance routes
- Fee installments/discounts
- Confirmed collections only
- Foreign child 404
- No write buttons / journal IDs / admin notes

---

## 8. RBAC & 403

| Scenario | Expected | Observed |
|----------|----------|----------|
| qa.pm → reference-data | 403 | 403 |
| qa.pm → payment-collections | 403 | 403 |
| UI empty vs forbidden | forbidden state | hub links gated; collection pages use `RequireAdminPermission(FINANCE_VIEW_PAYMENTS)` |

---

## 9. Journal error codes (static)

All four codes map to i18n keys in `finance-normalize.ts` + `messages/*.json`:

- `invalid_journal`
- `journal_inactive`
- `journal_not_allowed`
- `journal_company_mismatch`

Live generation not attempted (no draft POST without journals).

---

## 10. RTL/LTR

Static i18n parity verified (213 finance keys × 4 langs). Browser visual pass deferred for parent-blocked release; admin API paths validated. No finance overflow fixes required in this pass.

---

## 11. Corrections (this pass)

**Commit:** `fix(finance): close live web finance QA findings`

1. Hide collections hub link without `finance.view_payments`
2. Finance student profile fallback when admin student record is forbidden
3. `StudentFee.name` type for API display label
4. `finance-auth-diagnosis.mjs` — test `qa.pm`, `done`, `qa.parent`
5. `finance-live-qa.mjs` — repeatable live QA harness
6. Extended journal error tests in `finance-web-2-tests.mjs`

No brand, Odoo, Flutter, or credential changes.

---

## 12. Release decision

| Criterion | Status |
|-----------|--------|
| qa.pm QA | PASS |
| done QA | PASS (journal-empty OK) |
| Parent QA | BLOCKED |
| typecheck/build/tests | PASS |
| Secrets in Git | NO |
| Push | **NO** |

---

```
Closure status: BLOCKED_BY_PARENT_CREDENTIAL
Branch: feat/finance-web-2-parent-admin-integration
Initial HEAD: a68dce7e88c7d9de7ed520da7d230f7a9a19c442
QA/fix commit (prior): a68dce7e88c7d9de7ed520da7d230f7a9a19c442
Current HEAD: 79631aa0803d443396e102c78ceb8b03fa42d6ad
QA worktree: D:\app\school-nexjs-finance-qa @ a68dce7 clean
Env files ignored: YES
Secrets committed: NO
qa.pm authentication: PASS
qa.pm overview QA: PASS
qa.pm student search QA: PASS
qa.pm payment access: PASS (403 expected)
done authentication: PASS
done payment permissions: PASS
Reference data QA: PASS (done)
Journal list: EMPTY (0 journals in alwah)
Journal-empty behavior: PASS
Collection draft QA: SKIPPED (no journals — correct)
Parent authentication: FAIL (invalid_credentials)
Parent finance QA: NOT RUN
Foreign-child isolation: NOT RUN
Permission QA: PASS (qa.pm 403 documented)
RTL/LTR QA: STATIC ONLY
Typecheck: PASS
Build: PASS
Local tests: PASS
Odoo modified: NO
Flutter modified: NO
Push performed: NO
Working tree: dirty (brand only, unstaged)
Ready for push: NO
Blocking issues: BLOCKED_BY_PARENT_CREDENTIAL — update ODOO_QA_PARENT_PASSWORD for alwah; rerun finance-live-qa.mjs
```
