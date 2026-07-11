# الورقة المرجعية — خارطة اعتماد تصميم Finance في رقيم

**المنتج:** Raqeem School  
**المجال:** Finance UX/UI Adoption  
**المستودع:** `school-nexjs`  
**الحالة:** خارطة طريق معتمدة بعد Coverage Audit  
**تاريخ الحالة:** 10 يوليو 2026  

---

## 1. الهدف

هذه الوثيقة تحدد كيف يتم اعتماد تصميم Finance بعد إغلاق Design System Core.

القاعدة الأساسية:

```txt
Finance is not one page
and not one visual redesign task
```

Finance يحتوي:

- قوائم مستحقات.
- مستندات دفع.
- تحصيلات.
- شيكات.
- اتفاقات.
- أقساط.
- خطط رسوم.
- أرصدة دائنة.
- صندوق نقدي.
- بوابة مالية للتلميذ.

ولذلك يعتمد مسار cluster-based adoption مع حدود مالية صارمة.

---

## 2. القاعدة العليا للسلامة

مرحلة Design Adoption في Finance لا تغيّر:

- money movement semantics.
- allocation semantics.
- balance calculations.
- due/overdue semantics.
- reverse/cancel semantics.
- cheque lifecycle.
- cash session lifecycle.
- fee plan assignment semantics.
- billing authority semantics.
- RBAC.
- API contract.

إذا ظهرت مشكلة وظيفية، تُفصل عن Design Adoption.

---

## 3. جرد الأسطح المالية

| Surface | Route | Pattern | Risk | Current design direction |
|---|---|---|---|---|
| Finance Hub | `/admin/finance` | KPI/dashboard hub | Low | LOW_PRIORITY_ACCEPTABLE — CSS layers unreviewed (`RAQEEM-DESIGN` §17) |
| Billing Accounts | `/admin/finance/billing-accounts` | List + detail hub | Medium–High | Cluster 1 list-only |
| Arrears | `/admin/finance/arrears` | List + tabs + follow-up | Medium | Cluster 1 chrome-only |
| Services / Tariffs | `/admin/finance/services` | Catalog + inline form | Medium | Cluster 3 ADOPTED |
| Receipts | `/admin/finance/receipts` | List + detail/drawer | Medium | Cluster 2 list shell |
| Cheques | `/admin/finance/cheques` | List + lifecycle detail | High | Cluster 2 list shell only |
| Collections | `/admin/finance/collections` | List + money wizard | High | Cluster 4 list shell ADOPTED; wizard/workflows deferred |
| Installments | `/admin/finance/installments` | List + quick filters + KPIs | Medium | Cluster 1 |
| Agreements | `/admin/finance/agreements` | Scoped list + detail | High | Cluster 5 list shell ADOPTED; detail/amendments deferred |
| Fee Plans | `/admin/finance/fee-plans` | Workspace + assign wizard | Medium–High | Cluster 3 list/workspace chrome |
| Credit Balances | `/admin/finance/credit-balances` | List + apply drawers | High | Cluster 1 list-only |
| Cash Desk | `/admin/finance/cash-desk*` | Operational lifecycle workspace | High | Cluster 5 sessions list ADOPTED; lifecycle deferred |
| Student Fees gateway | `/admin/finance/student-fees` | Search gateway → Student 360 finance | Very High | DEFER_PARALLEL_WORK |

---

## 4. التصنيفات

### DEFER_PARALLEL_WORK

- Collections family workflow.
- Student Fees gateway touches linked to parallel student search/finance types.

### DEFER_CONTRACT_OR_WORKFLOW

- Collections wizard.
- Cheques lifecycle dialogs/transitions.
- Credit apply/allocation drawers.
- Cash Desk open/close/reopen.
- Agreements detail/amendments.
- Fee Plan assign flow.
- Student 360 finance repair/billing authority/change plan.
- Receipt reverse/PDF sensitive actions.

### READY_FOR_CLUSTER_ADOPTION

ضمن list chrome فقط:

- Billing Accounts.
- Installments.
- Arrears.
- Credit Balances.
- Receipts.
- Cheques.
- Fee Plans list/workspace chrome.

---

## 5. Cluster 1 — Receivable Operations Lists

### الصفحات

- `/admin/finance/billing-accounts`
- `/admin/finance/installments`
- `/admin/finance/arrears`
- `/admin/finance/credit-balances`

### الهدف

توحيد:

- list shell.
- search.
- URL filters.
- quick filters/tabs chrome.
- active filter state.
- KPI chrome.
- empty/no-match.
- refetch UX.
- pagination.
- responsive.
- RTL/LTR.

### الحدود الممنوعة

#### Billing Accounts

- FamilyCollectionDrawer.
- family collection allocation/review.
- billing authority changes.

#### Credit Balances

- apply-credit drawers.
- allocation payloads.
- reserved/available calculations.

#### Arrears

- follow-up workflow contract.
- reminder/escalation semantics.

#### Installments

- payment mutation.
- settlement semantics.
- due/overdue business logic.

### الخطر

```txt
Medium
```

### المرجع التصميمي الأقرب

- Students/Homeworks list patterns.
- Admissions tabs/workflow chrome عند الحاجة.
- internal Finance list panels كمصدر دلالات المجال.

### حالة التنفيذ

```txt
ADOPTED
commit: 60a52b5
```

---

## 6. Cluster 2 — Payment Documents Lists

### الصفحات

- Receipts list.
- Cheques list.

### النطاق المسموح

- page/list shell.
- search.
- filters.
- quick tabs.
- empty/refetch/pagination.
- table hierarchy.
- date/amount presentation.

### الحدود

لا تُلمس:

- receipt reverse semantics.
- PDF contract.
- cheque deposit/settle/reject/cancel lifecycle.

### الخطر

```txt
Medium–High
```

### التنفيذ

```txt
ADOPTED
commit: 92f5d96
```

---

## 7. Cluster 3 — Pricing and Plans

### الصفحات

- Fee Plans الآن.
- Services / Tariffs بعد إغلاق العمل الموازي.

### الهدف

توحيد presentation الخاصة بـ:

- catalog/setup lists.
- filters.
- pricing context.
- empty/refetch.
- list/workspace chrome.

### الحدود

لا تُلمس:

- Fee Plan assign semantics.
- Services payload الجاري تبسيطه قبل إغلاق المسار الموازي.

### الخطر

```txt
Medium
```

### حالة التنفيذ

```txt
Fee Plans — ADOPTED
Services/Tariffs — ADOPTED
Cluster 3 — COMPLETE
```

**assign wizard remains outside adopted scope.**

**deprecated `ServicesTariffsPanel` shim remains outside adopted scope.**

المسار التالي:

```txt
Cluster 4 — PARTIAL COMPLETE
Collections list shell — ADOPTED
Collection wizard/workflows — DEFER_CONTRACT_OR_WORKFLOW
```

**Collection wizard / family allocation / review / reverse / discard workflows remain outside adopted scope.**

المسار التالي:

```txt
Cluster 5 — Finance Shells assessment + safe adoption
```

---

## 8. Cluster 4 — Collection Operations

### الصفحات

- Collections list.
- لاحقًا مواءمة خفيفة للروابط مع Receipts/Cheques.

### حالة التنفيذ

```txt
Collections list shell — ADOPTED
Collection wizard/workflows — DEFER_CONTRACT_OR_WORKFLOW
Cluster 4 — PARTIAL COMPLETE
```

**Collection wizard / family allocation / review / reverse / discard workflows remain outside adopted scope.**

المسار التالي:

```txt
Cluster 5 — Finance Shells assessment + safe adoption
```

---

## 9. Cluster 5 — Finance Shells

### الصفحات

- Finance Hub.
- Cash Desk sessions list (+ lifecycle workspace deferred).
- Agreements scoped list (+ detail/amendments deferred).
- Student Fees gateway (deferred parallel).

### حالة التنفيذ

```txt
Cluster 5 — PARTIAL COMPLETE
```

| Surface | Status |
|---|---|
| Finance Hub | LOW_PRIORITY_ACCEPTABLE |
| Cash Desk Sessions List | ADOPTED |
| Cash Desk lifecycle | DEFER_CONTRACT_OR_WORKFLOW |
| Agreements list shell | ADOPTED |
| Agreements detail/amendments | DEFER_CONTRACT_OR_WORKFLOW |
| Student Fees Gateway | DEFER_PARALLEL_WORK |

```txt
Finance Design Adoption — SAFE SURFACES COMPLETE
```

لا يُفتح اعتماد workflows حساسة تلقائيًا بعد هذه المرحلة.

المسار التالي (عند الحاجة فقط، خارج safe shells):

```txt
Deferred finance workflows / Student Fees parallel / Finance Hub CSS review
```

---

## 10. ترتيب الأولوية الرسمي

```txt
1. Receivable Operations Lists
2. Payment Documents Lists
3. Pricing and Plans
4. Collection Operations
5. Finance Shells
```

ويُسمح بتغيير الترتيب فقط إذا تغيرت حالة العمل الموازي أو ظهرت حاجة تشغيلية أعلى.

---

## 11. منهج التنفيذ

لكل cluster آمن:

```txt
Audit confirm
→ Adoption
→ Targeted tests
→ Scoped diff review
→ Explicit staging
→ One commit
→ Push to origin/dev
```

لا:

- page-by-page micro stages.
- repeated full builds.
- repeated full test suites.
- cross-workstream cleanup.

---

## 12. سياسة الوسم داخل Finance

إذا تم اعتماد list surface فقط، يوضع الوسم على main list/panel component المناسب، لا على route shell إذا كان ذلك قد يوحي بأن detail drawers أو money workflows كلها adopted.

مثال:

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */
```

الوسم يعني اعتماد النطاق المحدد فعليًا فقط.

---

## 13. معايير نجاح Finance Design Adoption

كل cluster ناجح يجب أن يثبت:

- لا API contract change.
- لا backend semantics change.
- لا RBAC change.
- لا money movement semantics change.
- no-data/no-match صحيحة.
- refetch UX سليمة.
- pagination صحيحة.
- amounts/dates واضحة.
- responsive سليم.
- RTL/LTR سليم.
- tests موجهة ناجحة.
- commit نظيف.
- عدم دخول ملفات من العمل الموازي.

---

## 14. الحكم الحالي

Finance لم يعد مجالًا مجهولًا من ناحية التصميم.

لدينا الآن:

```txt
Coverage audit complete
→ Cluster 1 ADOPTED (60a52b5)
→ Cluster 2 ADOPTED (92f5d96)
→ Cluster 3 COMPLETE (Fee Plans + Services/Tariffs ADOPTED)
→ Cluster 4 PARTIAL COMPLETE (Collections list shell ADOPTED)
→ Cluster 5 PARTIAL COMPLETE (Cash Desk Sessions List + Agreements list ADOPTED; Hub low-priority; Student Fees deferred)
→ Finance Design Adoption — SAFE SURFACES COMPLETE
```

الحكم:

```txt
Finance Design Adoption Roadmap = SAFE SURFACES COMPLETE
Cluster 5 = PARTIAL COMPLETE
```

الاعتماد يتم فقط بعد تنفيذ cluster ونجاح QA ووجود marker مناسب داخل الكود.
