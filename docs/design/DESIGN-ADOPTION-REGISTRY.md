# سجل حالة اعتماد نظام تصميم رقيم — Design Adoption Status & Registry

**المنتج:** Raqeem School  
**المستودع:** `school-nexjs`  
**حالة الوثيقة:** سجل حالة تنفيذي متغير  
**تاريخ الحالة:** 10 يوليو 2026  
**قاعدة المرجع:** حالة الكود الفعلية ووسم `@design-status` أعلى أولوية من هذا السجل  

---

## 1. الغرض

هذه الوثيقة تسجل حالة اعتماد الواجهات الحالية وتفصل بين:

- ما تم اعتماده فعليًا.
- ما أُغلق إنتاجيًا.
- ما هو مؤجل بسبب عمل موازٍ.
- ما هو مؤجل بسبب عقد أو workflow حساس.
- ما هو منخفض الأولوية.

هذه الوثيقة ليست بديلًا عن الوسم داخل الكود.

القاعدة:

```txt
Page Tag > Registry
```

---

## 2. الحالة العامة

### Design System Core

```txt
COMPLETE
```

### Release state

```txt
Core adoption released to origin/main
Production representative smoke passed
Core path closed
```

### Production release reference

```txt
origin/main includes 7632ec8
```

### Core development closure reference

```txt
origin/dev core closure reference: d2150a2
```

---

## 3. الأسطح الأساسية المعتمدة

| Surface | Route | Pattern | Status |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | Role-aware operational dashboard | ADOPTED |
| AppShell / Header | global shell | Context + global search | ADOPTED |
| Staff | `/admin/staff` | CRUD list | ADOPTED |
| Students | `/admin/students` | Search + filters + pagination | ADOPTED |
| Admissions List | `/admin/admissions` | List/Table + workflow | ADOPTED |
| Admissions Kanban | `/admin/admissions` | Kanban workflow | ADOPTED |
| Parents | `/admin/parents` | Family cards | ADOPTED |
| Teachers | `/admin/teachers` | Administrative DataTable | ADOPTED |
| Attendance | `/admin/attendance` | Operational workspace | ADOPTED |
| Homeworks | `/admin/homeworks` | Academic list | ADOPTED |
| Resources | `/admin/resources` | Academic resource list | ADOPTED |
| Exams | `/admin/exams` | Planning/schedule list | ADOPTED |
| Exam Results | `/admin/exam-results` | Academic outcomes list | ADOPTED |
| Classes | `/admin/classes` | Academic structure browser | ADOPTED |
| Levels | `/admin/levels` | Grouped hierarchy cards | ADOPTED |
| Subjects | `/admin/subjects` | Tier-grouped browser | ADOPTED |
| Channels | `/admin/channels` | Communication cards | ADOPTED |
| Timetable | `/admin/timetable` | Scheduling operational table | ADOPTED |
| Academic Hub | `/admin/academic` | Navigation hub cards | ADOPTED |
| Settings Hub | `/admin/settings` | Settings navigation cards | ADOPTED |

---

## 4. ما تم إثباته خلال Core Adoption

### 4.1 Search surfaces

تم تثبيت نموذج موحد لمحرك بحث التلميذ:

```txt
One Student Search Engine
├── Spotlight → navigate
├── Students List → browse/filter/paginate
└── StudentSearchPicker → select/callback
```

مع الحفاظ على:

- matched_on.
- did-you-mean الحذر.
- عدم التصحيح التلقائي.
- keyboard accessibility.
- نفس backend search semantics.

### 4.2 Empty and refetch states

تم تثبيت التمييز بين:

```txt
no-data
no-match
empty workflow column
initial loading
refetching
error
```

### 4.3 Page patterns

تم إثبات عدة أنماط مرجعية بدل فرض شكل واحد:

- DataTable administrative list.
- Search/Filter list.
- Table + Kanban workflow.
- Family cards.
- Academic lists.
- Academic browsers.
- Operational workspace.
- Hub cards.

---

## 4bis. Finance Design Adoption — الحالة الحالية

```txt
Finance Safe Surfaces: COMPLETE
```

هذا يعني إغلاق الأسطح الآمنة (list/shell chrome) فقط — وليس اعتماد كل Finance workflows.

| Surface | Route | Status | Notes |
|---|---|---|---|
| Billing Accounts list | `/admin/finance/billing-accounts` | ADOPTED | Cluster 1 — `60a52b5` |
| Installments list | `/admin/finance/installments` | ADOPTED | Cluster 1 — `60a52b5` |
| Arrears list/tabs chrome | `/admin/finance/arrears` | ADOPTED | Cluster 1 — `60a52b5` |
| Credit Balances list | `/admin/finance/credit-balances` | ADOPTED | Cluster 1 — `60a52b5` |
| Receipts list | `/admin/finance/receipts` | ADOPTED | Cluster 2 — `92f5d96` |
| Cheques list | `/admin/finance/cheques` | ADOPTED | Cluster 2 — `92f5d96` |
| Fee Plans list/workspace chrome | `/admin/finance/fee-plans` | ADOPTED | Cluster 3 — assign wizard remains outside adopted scope |
| Services / Tariffs | `/admin/finance/services` | ADOPTED | Cluster 3 — `ServicesPanel` list/form chrome; deprecated `ServicesTariffsPanel` shim remains outside adopted scope |
| Collections list shell | `/admin/finance/collections` | ADOPTED | Cluster 4 — list chrome only; wizard / family allocation / review / reverse / discard remain outside adopted scope |
| Cash Desk Sessions List | `/admin/finance/cash-desk/sessions` | ADOPTED | Cluster 5 — list chrome only; open/close/reopen lifecycle remains outside adopted scope |
| Agreements list shell | `/admin/finance/agreements` | ADOPTED | Cluster 5 — list chrome only; detail / amendments remain outside adopted scope |
| Finance Hub | `/admin/finance` | LOW_PRIORITY_ACCEPTABLE | Not adopted |
| Student Fees Gateway | `/admin/finance/student-fees` | DEFER_PARALLEL_WORK | Not adopted |
| Family registration access + result states | `/admin/students/family/new` | REVIEW-NEEDED | REG_FIN_RBAC_TERMS_1 — local `students.create` gate + partial-success clarity; payment-during-registration out of scope |
| Family finance summary refetch | Student 360 family summary | REVIEW-NEEDED | REG_FIN_RBAC_TERMS_1 — keepPreviousData refetch; full Student 360 finance still unreviewed |

---

## 5. الأسطح المؤجلة

### 5.1 DEFER_PARALLEL_WORK

#### Finance

- Student Fees Gateway (`/admin/finance/student-fees`) — coupling مع student search/finance types ما زال قائمًا.

### 5.2 DEFER_CONTRACT_OR_WORKFLOW

- Academic Setup workflows.
- School Branding.
- Collection Wizard.
- Family Allocation/Review workflow.
- Receipt reverse sensitive workflow.
- Cheque lifecycle host/dialogs/transitions.
- Credit Apply/Allocation drawers.
- Cash Desk open/close/reopen lifecycle.
- Agreement detail/amendments.
- Fee Plan assign workflow.
- Student 360 finance workflows.
- Installments financial semantics beyond list chrome.

### 5.3 LOW_PRIORITY_ACCEPTABLE

- Finance Hub (`/admin/finance`) — dashboard CSS layers not fully reviewed (`RAQEEM-DESIGN` §17).
- detail/create secondary flows not currently high priority.
- pages that are visually acceptable and best reviewed when their functional workflow is touched.

---

## 6. القيود المعمارية المعروفة

هذه القيود موثقة ولا تُعتبر failures في Design Adoption:

### Parents

```txt
server pagination by guardian records
vs
client family grouping
```

قد يؤدي إلى عائلة جزئية عبر صفحات.

### Admissions

```txt
server totals
vs
some local post-filtering
```

### Resources/Homeworks وغيرها

بعض الصفحات لا تملك full URL sync أو filters إضافية، لأن العقد الحالي لا يدعمها أو لم تكن ضمن الأولوية.

### Channels

حتى 100 عنصر بدون pagination UI وفق العقد الحالي.

### Timetable

بعض الفلاتر client-side على القائمة المحملة؛ لم يتم تحويلها إلى calendar/grid.

---

## 7. سياسة تحديث هذا السجل

يُحدّث هذا السجل عند:

- إغلاق cluster تصميم كبير.
- إصدار مجموعة adopted إلى main.
- تغير تصنيف سطح من deferred إلى adopted.
- ظهور regression يغيّر حكم الاعتماد.

لا يُحدّث عند كل تعديل CSS صغير.

---

## 8. قواعد الحكم

### ADOPTED

- مراجعة فعلية تمت.
- marker موجود في المكوّن أو الصفحة المناسبة.
- tests/smoke المناسب نجح.

### UNREVIEWED

- لا marker.
- لا حكم اعتماد سابق مثبت.

### REVIEW-NEEDED

- مراجعة جزئية فعلية.
- فجوة داخل الصفحة نفسها تمنع الإغلاق.

### DEFERRED

- parallel work.
- contract gap.
- workflow sensitivity.
- low priority.

---

## 9. الحكم الحالي

```txt
Raqeem Design System Core = COMPLETE
Finance Safe Surfaces = COMPLETE
```

العمل المستقبلي ليس إعادة فتح Core أو إعادة اعتماد الأسطح الآمنة، بل:

```txt
Deferred finance workflows (عند الحاجة فقط)
→ Academic Setup Design Adoption
→ School Branding Adoption
→ Detail/Create flows تدريجيًا عند لمسها
```

مع الحفاظ على القاعدة:

```txt
Cluster-based execution
not page-by-page token-heavy loops
```
