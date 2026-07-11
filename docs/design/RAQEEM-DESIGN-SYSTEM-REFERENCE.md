# الورقة المرجعية الرسمية — نظام تصميم رقيم واعتماده التشغيلي داخل Next.js

**اسم المنتج:** رَقِيم — Raqeem  
**اسم المشروع التقني:** `school`  
**المستودع المستهدف:** `school-nexjs`  
**المرجع المركزي داخل المستودع:** `docs/design/RAQEEM-DESIGN.md`  
**حالة الوثيقة:** مرجع رسمي بعد اكتمال اعتماد Design System Core  
**الإصدار:** 2.0  
**تاريخ التحديث:** 10 يوليو 2026  

---

## 1. الغرض من هذه الوثيقة

هذه الوثيقة هي المرجع التشغيلي الأعلى لاعتماد نظام تصميم رقيم داخل Next.js.

الإصدار الأول وضع المبادئ قبل التنفيذ. أما هذا الإصدار فيعكس ما تم إثباته فعليًا بعد:

- إنشاء المرجع المركزي `RAQEEM-DESIGN.md`.
- اعتماد عدد كبير من الأسطح الإدارية الرئيسية.
- التحقق من وسوم الاعتماد داخل الكود.
- إصدار Design System Core من `dev` إلى `main`.
- التحقق الإنتاجي الممثل وإغلاق المسار الأساسي.

الهدف الآن ليس شرح فكرة مستقبلية، بل تثبيت **طريقة العمل الرسمية** التي يجب أن يتبعها كل وكيل Next.js وكل مرحلة UI لاحقة.

---

## 2. الحكم الرسمي الحالي

مسار:

```txt
Raqeem Design System Core
```

حكمه الحالي:

```txt
COMPLETE
```

وقد تم:

```txt
Foundation
→ Core Adoption
→ dev to main release
→ Production verification
→ Final closure
```

المرجع الإنتاجي الذي أُغلق عليه مسار Core:

```txt
origin/main includes release commit 7632ec8
```

هذا لا يعني أن كل صفحة في النظام أصبحت adopted، بل يعني أن **الأسطح الأساسية التي تمثل لغة المنتج قد اعتمدت وأصبحت مرجعًا لبقية العمل**.

---

## 3. تعريف نظام تصميم رقيم

نظام التصميم في رقيم ليس مكتبة ألوان أو CSS فقط.

هو مجموعة من:

- شخصية المنتج.
- مبادئ التخطيط.
- أنماط القوائم والجداول.
- أنماط البطاقات.
- أنماط البحث والفلاتر.
- حالات loading / refetch / error / empty / no-match.
- دلالات الحالات والـbadges.
- قواعد RTL/LTR.
- قواعد responsive.
- حدود التغيير أثناء تطوير feature.
- قواعد اعتماد الصفحة ووضع الوسم.
- منهج مراجعة الوكلاء للواجهات.

المعادلة الرسمية:

```txt
Raqeem Product Vision
+
Operational UX
+
Existing Proven Patterns
+
RTL/LTR
+
Domain Constraints
↓
RAQEEM-DESIGN.md
↓
Consistent Next.js UI
```

---

## 4. شخصية واجهة رقيم

رقيم منصة تشغيل للمدارس الخاصة، لذلك يجب أن تبدو الواجهة:

```txt
هادئة
موثوقة
منظمة
تشغيلية
كثيفة بالمعلومات دون ازدحام
إدارية دون شكل ERP تقليدي
واضحة لموظفي المدرسة غير التقنيين
قوية في العربية RTL
وسليمة في الفرنسية/الإنجليزية/الإسبانية LTR
```

القواعد العملية:

1. الوضوح أهم من الاستعراض.
2. السياق التشغيلي يجب أن يظهر قبل التفاصيل الثانوية.
3. الألوان تخدم المعنى، ولا تكون المعنى الوحيد.
4. العمليات الحساسة لا تبدو كالأفعال العادية.
5. الصفحة تساعد المستخدم على الفهم ثم العمل.
6. لا يُختزل التصميم في تجميل CSS؛ يجب مراجعة الحالات والتفاعل والوضوح.

---

## 5. المبادئ غير القابلة للتنازل

### 5.1 التبني تدريجي

```txt
Progressive adoption
not sweeping redesign
```

لا نعيد تصميم المستودع كاملًا دفعة واحدة.

القاعدة:

- الصفحة الجديدة تعتمد المرجع من البداية.
- الصفحة adopted تحافظ على المرجع عند لمسها.
- الصفحة بلا وسم تُعد unreviewed تلقائيًا.
- الصفحة غير المعتمدة تُراجع ضمن حدود المهمة أو تدخل مرحلة مستقلة إذا كانت ذات قيمة عالية.

### 5.2 إعادة الاستخدام قبل الإنشاء

الأولوية:

```txt
Reuse proven primitives
→ reuse proven page patterns
→ create local pattern only when domain requires it
```

لا ننشئ:

- FilterBar عام قبل إثبات الحاجة.
- status system محلي جديد بلا سبب.
- card system جديد لكل feature.
- abstraction مشترك بين صفحتين لمجرد التشابه الشكلي.

### 5.3 المجال الوظيفي يُحترم

التوحيد لا يعني تحويل كل صفحة إلى DataTable.

الأنماط المثبتة في رقيم تشمل مثلًا:

- CRUD list.
- Search + Filters + Pagination.
- Table + Kanban + Workflow.
- Family cards.
- Operational workspace.
- Academic list.
- Academic structure browser.
- Hub cards.

القواعد المشتركة تُعاد استخدامها، لكن هوية المجال تُحفظ.

### 5.4 التصميم لا يغير العقد

مرحلة Design Adoption لا تغيّر تلقائيًا:

- API contract.
- backend semantics.
- RBAC.
- workflow transitions.
- financial semantics.
- scheduling semantics.
- grading semantics.
- relationship semantics.

إذا ظهر نقص في العقد، يُوثق كمرحلة منفصلة.

---

## 6. المرجع المركزي داخل المستودع

المرجع الأساسي:

```txt
docs/design/RAQEEM-DESIGN.md
```

يجب أن يبقى مرجعًا حيًا، لكن تحديثه يتم بمرحلة منضبطة، لا بتعديلات عشوائية أثناء كل feature.

يمكن مستقبلًا إضافة مراجع مجال متخصصة عندما يصبح المجال ناضجًا بما يكفي، مثل:

```txt
docs/design/finance.md
docs/design/academic-setup.md
docs/design/student-360.md
```

لكن لا تُنشأ ملفات متخصصة قبل الحاجة الفعلية.

---

## 7. وسم اعتماد الصفحة

الصيغة الرسمية:

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */
```

المعنى:

```txt
تمت مراجعة الصفحة أو المكوّن الرئيسي فعليًا
وأصبح متوافقًا مع المرجع ضمن نطاقه المعلن
```

### قاعدة غياب الوسم

```txt
@design-status adopted
→ معتمد

لا يوجد وسم
→ unreviewed تلقائيًا
```

لا نضيف `legacy` لكل صفحة قديمة.

### review-needed

تُستعمل فقط عند وجود مراجعة جزئية موثقة وفجوة داخل الصفحة نفسها:

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 */
```

لا تستخدم بدل غياب الوسم.

---

## 8. متى تصبح الصفحة adopted؟

لا يكفي تغيير لون أو spacing.

يجب أن تشمل المراجعة، بحسب طبيعة الصفحة:

- page shell.
- header hierarchy.
- toolbar.
- search.
- filters.
- active filter state.
- table/card/Kanban presentation.
- status semantics.
- empty/no-match.
- loading/refetch/error.
- pagination.
- responsive.
- RTL/LTR.
- focus/keyboard accessibility.

لا يلزم أن تحتوي كل صفحة على كل عنصر؛ المطلوب مراجعة العناصر الموجودة فعليًا.

---

## 9. القواعد المثبتة لأنماط القوائم

### 9.1 Search

عند وجود البحث:

- field واضح.
- clear action.
- debounce عندما يناسب العقد الحالي.
- page reset عند تغير query.
- `dir="auto"` للنص الحر.
- عدم تحويل client search إلى server search أو العكس دون عقد واضح.

### 9.2 Filters

- تمييز primary وsecondary عند الحاجة.
- reset واضح.
- active filters مرئية عندما تكون الصفحة معقدة.
- عدم إضافة filter غير مدعوم.
- عدم تكرار control لنفس المعنى.

### 9.3 Empty states

يجب التمييز بين:

```txt
No data
≠
No match
≠
Empty workflow column
```

### 9.4 Refetch UX

يُمنع النمط التالي:

```txt
results
→ false empty flash
→ new results
```

الأفضل:

- الحفاظ على النتائج السابقة بصريًا.
- hint أو opacity خفيفة أثناء refetch.
- initial loading منفصل عن refetch.

### 9.5 Pagination

يجب أن يطابق:

```txt
Pagination.pageSize
=
API page_size
```

أي تناقض بين server pagination وclient post-filtering أو grouping يُوثق كقيد معماري، ولا يُخفى بصريًا.

---

## 10. القواعد المثبتة للعرض

### 10.1 Tables

- الهوية أولًا.
- السياق الأكاديمي أو التشغيلي بعد الهوية.
- الأرقام والمبالغ واضحة وثابتة.
- الإجراءات لها touch targets مناسبة.
- truncation مع وسيلة لمعرفة النص الكامل عند الحاجة.
- overflow الأفقي يُدار بوضوح.

### 10.2 Cards

تُستخدم عندما يكون الكيان أو التجميع نفسه مهمًا بصريًا، مثل:

- العائلات.
- القنوات.
- تصفح البنية الأكاديمية.
- hubs.

لا تتحول كل cards إلى links كاملة إذا كانت تحتوي actions متعارضة.

### 10.3 Kanban

Kanban أداة workflow، وليس مجرد جدول مقسم إلى بطاقات.

يجب الحفاظ على:

- وضوح الأعمدة.
- counts.
- الحالات الفارغة للأعمدة.
- دلالة workflow.
- عدم تغيير drag/drop semantics أثناء adoption.

### 10.4 Operational Workspaces

صفحات مثل Attendance وTimetable تحتاج hierarchy تشغيلية، مثل:

```txt
Current context
→ filters/selection
→ records
→ operational action
→ feedback/correction/conflicts
```

لا تُعامل كصفحات CRUD بسيطة.

---

## 11. RTL/LTR

القواعد الرسمية:

- `dir="auto"` للأسماء والعناوين الحرة.
- `dir="ltr"` للهاتف، الأكواد، الأوقات، بعض التواريخ، الدرجات والمبالغ عند الحاجة.
- استخدام logical CSS properties قدر الإمكان.
- مراجعة الأيقونات الاتجاهية.
- عدم قلب المنطق الزمني في RTL بصورة خاطئة.
- shortcut hints الزخرفية يمكن أن تكون `aria-hidden`، لكن عناصر التفاعل لا توضع داخل شجرة مخفية.

---

## 12. Accessibility

القواعد المثبتة:

- `focus-visible` واضح.
- icon-only controls لها accessible name.
- العناصر التفاعلية لا تكون داخل `aria-hidden`.
- `aria-pressed` للتبديلات ذات الحالة عند الحاجة.
- keyboard navigation تُختبر للمكونات التي تعتمد الاختيار والتنقل.
- اللون ليس الوسيلة الوحيدة لشرح الحالة.

---

## 13. منهج العمل مع الوكلاء

كل برومبت UI أو UX يجب أن يحافظ على:

```txt
/goal
→ agent boundary
→ scope
→ /design
→ /task
→ /tests
→ /acceptance
```

قاعدة الإيقاف:

إذا لم يكن الوكيل هو وكيل Next.js، يتوقف فورًا قبل أي فحص أو تعديل أو تشغيل أو لمس Git.

---

## 14. قاعدة دمج المراحل المتقاربة

بعد تجربة مسار الاعتماد، يعتمد المشروع القاعدة التالية لتقليل استهلاك الوقت والتوكن:

```txt
صفحات أو قرارات متقاربة وظيفيًا
→ برومبت واحد

Audit + Adoption + Targeted Tests
→ مرحلة واحدة

Cluster آمن ومحدد
→ commit + push في نفس المسار عند النجاح
```

لا تُجزّأ المراحل إلا عند وجود:

- اختلاف حقيقي في المخاطر.
- عقد وظيفي حساس.
- عمل موازٍ قد يتعارض.
- حاجة إلى قرار منفصل قبل المتابعة.

أمثلة ناجحة من المشروع:

- Exams + Exam Results.
- Classes + Levels + Subjects.
- Channels + Timetable مع حدود مستقلة لكل مجال داخل نفس المرحلة.

---

## 15. العمل المتوازي داخل نفس مستودع Next.js

قاعدة إلزامية:

```txt
Current conversation/workstream only
```

عند وجود مشاريع متوازية:

- لا تفحص الملفات غير المرتبطة.
- لا تعدلها.
- لا تنظفها.
- لا تعمل stash لها.
- لا تعمل reset لها.
- لا تدخلها في staging.
- لا تعتبر working tree غير النظيف سببًا لخلط المسارات.

عند Git closure:

```txt
explicit staging only
```

وملفات `messages/*` تُعزل على مستوى مفاتيح المرحلة إذا كانت تحتوي تغييرات موازية.

---

## 16. سياسة الاختبار

القاعدة:

```txt
Targeted test
+
Short smoke when needed
```

لا:

- Full Suite بلا ضرورة.
- build متكرر.
- smoke متكرر للصفحة نفسها بلا سبب.

يمكن دمج الاختبارات الموجهة لمجموعة صفحات متقاربة في تشغيل واحد أو تقرير واحد.

فشل بيئة الاختبار لا يُخلط مع فشل المنطق؛ يتم التحقق من dependency/worktree environment أولًا.

---

## 17. الأنماط المرجعية المثبتة داخل المنتج

### Staff

مرجع:

```txt
CRUD list
PageHeader
Toolbar
ResourceView
DataTable
```

### Students

مرجع:

```txt
Search + Filters + URL state + Pagination
```

### Admissions

مرجع:

```txt
Table + Kanban + Workflow states + View switch
```

### Parents

مرجع:

```txt
Domain-specific Family Cards
```

### Attendance

مرجع:

```txt
Operational context + filters + correction UX boundary
```

### Academic Lists

Homeworks / Resources / Exams / Exam Results:

```txt
Academic list shell
Filters/chips
Empty variants
Refetch UX
Pagination
Domain-specific columns
```

### Academic Structure Browsers

Classes / Levels / Subjects:

```txt
Grouped cards
Client search
Context filters
No-data/no-match
```

### Channels

مرجع:

```txt
Communication domain cards
```

### Timetable

مرجع:

```txt
Scheduling operational table + inline form
```

### Hubs

Academic Hub / Settings Hub:

```txt
Navigation cards
Descriptions
Focus-visible
Responsive grid
```

---

## 18. الأسطح المؤجلة ليست فشلًا في النظام

يجب التفريق بين:

```txt
Core complete
≠
Every page adopted
```

الأسطح قد تؤجل بسبب:

- parallel work.
- contract gap.
- workflow sensitivity.
- low priority.

هذا جزء من التبني التدريجي، وليس نقصًا في الحكم النهائي.

---

## 19. العلاقة بين المرجع والسجل

الوثيقة الثابتة:

```txt
RAQEEM-DESIGN.md
+
هذه الورقة المرجعية
```

أما سجل الحالة المتغير فيكون في وثيقة منفصلة.

عند التعارض:

```txt
Code adoption marker
>
Registry/status document
```

الحالة داخل الكود هي المرجع الأول.

---

## 20. الحكم النهائي

يعتمد مشروع رقيم رسميًا:

1. `RAQEEM-DESIGN.md` كمرجع التصميم المركزي داخل Next.js.
2. `@design-status adopted` كعلامة الاعتماد المباشرة.
3. غياب الوسم = unreviewed.
4. `review-needed` للمراجعة الجزئية فقط.
5. التبني التدريجي بدل redesign شامل.
6. إعادة استخدام الأنماط المثبتة قبل إنشاء أنماط جديدة.
7. احترام domain-specific UX.
8. عدم تغيير العقود الوظيفية داخل Design Adoption.
9. دمج الصفحات والمراحل المتقاربة في clusters لتقليل الوقت والتوكن.
10. اختبارات موجهة قصيرة بدل التكرار وFull Suite غير الضروري.
11. فصل صارم بين مسارات العمل المتوازية.
12. اعتبار Design System Core مكتملًا ومغلقًا، مع استمرار adoption للمجالات المؤجلة كمشاريع مستقلة.

---

## 21. الخلاصة التنفيذية

رقيم وصل من حالة:

```txt
صفحات جيدة لكن متفاوتة
```

إلى حالة:

```txt
مرجع مركزي
+
أنماط مثبتة
+
وسم اعتماد داخل الكود
+
منهج مراجعة موحد
+
Core surfaces معتمدة
+
مسار واضح للمجالات المؤجلة
```

الهدف المستقبلي ليس إعادة فتح Core، بل الحفاظ عليه، ومنع regressions، واعتماد المجالات المؤجلة تدريجيًا وفق حدودها الحقيقية.
