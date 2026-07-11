# فهرس مصادر نظام تصميم رقيم

**الحالة:** فهرس اعتماد داخلي  
**التاريخ:** 10 يوليو 2026  

---

## 1. الهدف

هذا الملف يحدد وظيفة كل وثيقة، ويمنع خلط:

- القواعد الثابتة.
- الحالة التنفيذية المتغيرة.
- خارطة Finance الخاصة.

---

## 2. ترتيب المرجع

### المصدر الأول داخل الكود

```txt
@design-status adopted
```

أو غياب الوسم.

الحالة داخل الكود هي المرجع الأول لحالة الصفحة.

---

### المرجع المركزي داخل المستودع

```txt
docs/design/RAQEEM-DESIGN.md
```

وظيفته:

- Product Character.
- Layout.
- Typography.
- Spacing.
- Cards.
- Tables.
- Forms.
- Dialogs.
- Empty/Loading/Error states.
- Status semantics.
- RTL/LTR.
- Responsive.

---

### الورقة المرجعية الرسمية

الملف المصدر:

```txt
raqeem_design_system_official_reference_v2.md
```

الموقع المقترح داخل المستودع:

```txt
docs/design/RAQEEM-DESIGN-SYSTEM-REFERENCE.md
```

وظيفته:

- قواعد adoption.
- وسم adopted/review-needed.
- منهج العمل مع الوكلاء.
- قواعد cluster-based execution.
- فصل المسارات الموازية.
- سياسة الاختبارات.
- الأنماط المرجعية المثبتة.

هذه وثيقة مستقرة نسبيًا.

---

### سجل التغطية والحالة

الملف المصدر:

```txt
raqeem_design_adoption_status_and_registry.md
```

الموقع المقترح داخل المستودع:

```txt
docs/design/DESIGN-ADOPTION-REGISTRY.md
```

وظيفته:

- ما هو adopted حاليًا.
- ما هو deferred.
- ما هو low priority.
- release state.
- architectural limitations المعروفة.

هذه وثيقة متغيرة ويجب تحديثها بعد clusters أو releases كبيرة، لا بعد كل تعديل صغير.

---

### خارطة Finance

الملف المصدر:

```txt
raqeem_finance_design_adoption_roadmap.md
```

الموقع المقترح داخل المستودع:

```txt
docs/design/finance.md
```

وظيفته:

- Finance coverage matrix.
- workflow safety boundaries.
- clusters.
- priority order.
- adoption criteria.

هذه وثيقة مجال متخصصة.

---

## 3. قاعدة الأولوية عند التعارض

```txt
Code marker
>
RAQEEM-DESIGN.md
>
Official Design System Reference
>
Adoption Registry
>
Roadmap/status notes
```

تفسير ذلك:

- حالة الصفحة تُقرأ من الكود أولًا.
- قواعد التصميم تُقرأ من المرجع المركزي.
- قواعد adoption تُقرأ من الورقة الرسمية.
- سجل الحالة قد يتأخر عن الكود، لذلك لا يتغلب عليه.

---

## 4. قاعدة التحديث

### RAQEEM-DESIGN.md

يُحدّث عند تغير قاعدة تصميم مركزية مثبتة.

### Official Reference

يُحدّث عند تغير منهج adoption أو قواعد العمل الرسمية.

### Adoption Registry

يُحدّث بعد:

- cluster adoption كبير.
- release رئيسي.
- انتقال surface من deferred إلى adopted.

### Finance Roadmap

يُحدّث عند:

- إغلاق parallel work مؤثر.
- نجاح cluster adoption.
- تغير أولوية clusters.
- ظهور contract gap جديد.

---

## 5. قرار الاعتماد المقترح

يُنصح باعتماد الملفات الأربعة بهذه البنية:

```txt
docs/design/
├── RAQEEM-DESIGN.md
├── RAQEEM-DESIGN-SYSTEM-REFERENCE.md
├── DESIGN-ADOPTION-REGISTRY.md
└── finance.md
```

ولا تُنشأ مراجع مجال إضافية إلا عندما ينضج المجال بما يكفي ليستحق قواعد خاصة.
