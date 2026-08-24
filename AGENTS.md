# AGENTS.md — Raqeem School Next.js

> **Runtime repository instructions**  
> المستودع: `geniustep/school-nexjs`  
> الفرع التنفيذي المعتاد: `dev`  
> المرجع المركزي المعتمد: `geniustep/raqeem-development-core/school-nexjs/AGENTS.md`

هذا الملف هو نسخة تشغيلية مختصرة من تعليمات رقيم المعتمدة. عند التعارض، تطبق المراجع الحاكمة في `raqeem-development-core` وفق ترتيب الحقيقة أدناه.

---

## 1. هوية المستودع

```txt
school-nexjs
=
Next.js Administrative Workspace
+ BFF / Session Transport
+ Role-Based User Experience
```

يخدم أساسًا الإدارة المدرسية، التسجيل والقبول، مالية التلاميذ، الطاقم والصلاحيات، الإدارة البيداغوجية، استعمال الزمن، الحضور والغياب والتواصل المؤسسي.

هذا المستودع **ليس** مصدر الحقيقة الوظيفي أو المالي أو الأمني.

---

## 2. الوكيل الرسمي

اعمل هنا فقط عندما تكون المهمة موجهة إلى:

```txt
RAQEEM_NEXTJS_AGENT
```

الاسم المختصر `NEXTJS AGENT` هو Alias للهوية نفسها.

توقف عند:

```txt
WRONG_AGENT
WRONG_REPOSITORY
WRONG_BRANCH
MISSING_SCOPE
MISSING_REFERENCE
UNSAFE_GIT_CONTEXT
ARCHITECTURAL_OWNERSHIP_MISMATCH
BACKEND_CONTRACT_NOT_CONFIRMED
PRODUCTION_NOT_APPROVED
```

لا تنفذ هنا مهام نماذج Odoo، قواعد الأعمال الخلفية، Migration، ترقية الموديول، Flutter، السيرفرات أو قواعد البيانات.

---

## 3. ترتيب الحقيقة

```txt
1. الأمر الصريح الأحدث لصاحب المشروع
2. RAQEEM-SCHOOL-ENVIRONMENTS-AND-RELEASE-REGISTRY-V1.md
3. RAQEEM-SCHOOL-PROMPT-EXECUTION-GOVERNANCE-V3.md
4. RAQEEM-SCHOOL-PROJECT-VISION-AND-ARCHITECTURE-V4.md
5. RAQEEM-AGENT-FOUNDATION-REFERENCE-V1.md
6. المرجع التخصصي للمجال
7. العقد الفعلي والحالة المثبتة في الكود
8. تقرير إغلاق موثوق تابع للمسار
9. المواد التاريخية
```

بالنسبة إلى التصميم:

```txt
Code marker
> docs/design/RAQEEM-DESIGN.md
> RAQEEM-DESIGN-SYSTEM-OFFICIAL-REFERENCE-V2.md
> السجلات التاريخية
```

لا تعتمد على الذاكرة وحدها عندما يوجد مصدر رسمي أو دليل فعلي قابل للفحص.

---

## 4. الملكية المعمارية

Next.js مسؤول عن:

- صفحات ومساحة الإدارة.
- BFF وإدارة الجلسة والدور النشط.
- Forms وTables وSearch وFilters.
- Loading وRefetch وError وEmpty وNo-match states.
- Role-aware UX.
- RTL/LTR وإمكانية الوصول.
- تطبيق نظام تصميم رقيم.
- استهلاك عقود School API المثبتة.

Next.js غير مسؤول عن:

- احتساب الصلاحيات الفعلية.
- الحسابات المالية الحساسة.
- تقرير ما إذا كانت العملية مسموحة.
- اختراع Workflow أو `allowed_actions`.
- إعادة بناء قواعد Odoo محليًا.
- الوصول إلى PostgreSQL أو ORM عام.
- ترقية موديول Odoo أو تعديل Tenant مباشرة.

القاعدة:

```txt
Odoo / School API
→ decides

Next.js
→ presents, collects input and submits
```

إخفاء زر ليس حاجزًا أمنيًا؛ Backend يجب أن يرفض الطلب غير المسموح.

---

## 5. School API وBFF

استهلك Endpoints محددة حسب المجال، ولا تنشئ عقدًا عامًا من نوع:

```txt
model + domain + search_read
```

عند تعديل BFF:

- حافظ على Session isolation.
- حافظ على Tenant وSchool scope.
- مرر الدور النشط وفق العقد المثبت.
- لا تخزن دورًا قديمًا بصورة Sticky بين الطلبات.
- لا ترسل Header وQuery متعارضين.
- لا تكشف Cookie أو Token للعميل.
- لا تحول خطأ Backend إلى نجاح شكلي.
- حافظ على Error codes اللازمة للواجهة.

أي Contract change يحتاج تدقيق العقد، Backward compatibility، تحديث الأنواع وBFF والاستهلاك والاختبارات، وHandoff إلى Odoo إذا كان العقد الخلفي غير موجود.

---

## 6. فحص البداية الإلزامي

قبل أي تعديل:

1. تحقق من مسار المستودع.
2. تحقق من الفرع و`HEAD`.
3. اعرض `git status --short`.
4. حدد الملفات المملوكة للمهمة.
5. صنف العمل الموازي.
6. اقرأ المرجع التخصصي.
7. تتبع Route وPage وComponents وBFF والعقد.
8. افحص الاختبارات الموجودة.
9. حدد Design scope.
10. حدد Git policy.

المسار:

```txt
Inspect
→ Understand
→ Scope
→ Modify
```

نفذ أصغر تغيير متماسك. لا توسع المهمة تلقائيًا لمعالجة ديون أو فجوات خارج النطاق.

---

## 7. حماية العمل المتوازي

افترض دائمًا وجود عمل موازٍ.

ممنوع افتراضيًا:

```txt
git reset --hard
git checkout .
git restore .
git clean -fd
git stash
git add .
git add -A
git commit -am
```

ولا:

- تعدل تغييرات غيرك.
- تنظف الشجرة.
- تصلح ملفات غير مرتبطة.
- تضم تغييرات موازية في Commit.
- تنشئ Worktree أو Clone دائمًا دون قرار صريح.
- تغير Remote.

عند تصادم حقيقي:

```txt
BLOCKED — PARALLEL_CHANGE_COLLISION
```

---

## 8. الفروع وGit

```txt
dev
→ development and integration

main
→ official production frontend channel
```

الدمج أو الدفع إلى `main` أو النشر إلى Vercel Production هو **Release stage مستقل**.

الحالة الافتراضية للتطوير والتدقيق:

```txt
Git Policy: NO GIT CLOSURE
```

أي إن التنفيذ لا يمنح تلقائيًا إذن Stage أو Commit أو Push.

عند Git closure مصرح بها:

- Stage بمسارات صريحة فقط.
- افحص `git diff --cached --name-only`.
- افحص `git diff --cached --check`.
- راجع `git diff --cached`.
- لا تضم Artifacts أو ملفات Audit غير مطلوبة.
- لا تستخدم Force push.

---

## 9. نظام التصميم وإعادة الاستخدام

المرجع:

```txt
docs/design/RAQEEM-DESIGN.md
```

المبدأ:

```txt
Progressive adoption
not sweeping redesign
```

الأولوية:

```txt
Existing proven primitive
→ existing page pattern
→ local domain component
→ shared abstraction after proven reuse
```

لا تنشئ Table أو Filter أو Modal أو Page shell جديدًا قبل البحث عن الموجود.

وسم الاعتماد لا يضاف إلا بعد مراجعة الصفحة فعليًا:

```ts
/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */
```

---

## 10. القوائم والبحث والحالات

- حافظ على نوع البحث الحالي: Server أو Client أو Hybrid.
- لا تنفذ Client filtering فوق Server pagination دون توثيق.
- أي تغيير Search أو Filter يعيد الصفحة إلى البداية.
- وفر Clear وReset واضحين.
- ميز بين No data وNo match وLoading وRefetching وError.
- لا تعرض Empty flash أثناء Refetch.
- لا تضف Filter غير مدعوم من Backend.

---

## 11. RTL وi18n والمصطلحات

رقيم يدعم العربية RTL والفرنسية والإنجليزية والإسبانية LTR.

- استعمل Logical CSS properties.
- استعمل `dir="auto"` للأسماء والنص الحر.
- استعمل `dir="ltr"` للأكواد والهاتف والوقت عند الحاجة.
- راجع الأيقونات الاتجاهية.
- لا تكسر لغات LTR عند إصلاح العربية.
- لا تغير `fr`, `en`, `es` عندما تكون المرحلة عربية فقط.
- لا تضع نصوصًا ظاهرة Hardcoded إذا كان المجال يعتمد i18n.

مصطلحات مفضلة:

```txt
ولي الأمر
واجبات التمدرس
المؤدى
المتبقي
النتائج الدراسية
الحضور والغياب
استعمال الزمن
القسم
المستوى
التحصيل
وصل الأداء
```

---

## 12. Accessibility وTypeScript

كل عنصر تفاعلي يحتاج Accessible name وFocus واضحًا وKeyboard behavior مناسبًا.

- Icon-only button يحتاج `aria-label`.
- لا تجعل اللون الوسيلة الوحيدة لفهم الحالة.
- اربط رسالة الخطأ بالحقل.
- لا تستعمل `any` لتجاوز عقد قابل للنمذجة.
- حدث النوع المركزي بدل إنشاء نسخ متناقضة.
- مثل `null` و`undefined` وفق العقد الفعلي.
- لا تخترع Enum محليًا إذا كان Backend يملكه.
- لا تستخدم Cast واسعًا لإخفاء خطأ دون سبب موثق.

---

## 13. Server وClient boundaries والأداء

- لا تضف `use client` إلى Page أو Layout كامل دون حاجة.
- اجعل Client boundary أصغر ما يمكن.
- لا ترسل Secrets أو Session internals للعميل.
- لا تنقل Fetch حساسًا إلى المتصفح إذا كان BFF هو المسار المعتمد.
- راجع Cache policy للبيانات التشغيلية والحساسة.
- لا تنفذ Memoization أو Refactor أداء دون Bottleneck مثبت وقياس مناسب.
- تجنب Detail endpoint × N عندما يمكن للقائمة إرجاع الحقول المطلوبة.

---

## 14. الأمان والخصوصية

لا تعرض أو تسجل:

- Cookies أو Tokens أو Session IDs.
- كلمات المرور أو محتوى `.env`.
- بيانات صحية أو مالية غير لازمة.
- بيانات مدرسة أخرى.
- هاتفًا أو بريدًا كاملًا في Logs دون ضرورة.

يجب الحفاظ على:

```txt
Tenant
+ School scope
+ Active role
+ Capability
```

لا تثق في ID من URL، أو `school_id` من العميل، أو دور محلي غير مؤكد، أو زر مخفي باعتباره حماية.

---

## 15. الاختبارات وQA

الأصل:

```txt
Targeted tests only
```

- ابحث عن الاختبارات الموجودة أولًا.
- استعمل Scripts الموجودة في `package.json`.
- اختبر السلوك والعقد لا تفاصيل التنفيذ الهشة.
- غط Happy path وأهم Failure path وحدود Permission/Scope عند انطباقها.
- لا تشغل Full Suite إلا بطلب صريح أو خطر واسع أو Release gate.
- لا تصلح Baseline debt خارج النطاق.
- Build ناجح لا يعوض الاختبارات الوظيفية.

Browser QA المصادق يحتاج Credentials وTenant ودورًا وMutation policy مصرحًا بها. عند غيابها، صرح بالحد بدل الادعاء بـFull pass.

QA لا تمنح إذن Commit أو Push أو Release.

---

## 16. التقرير والتسليم

كل تقرير يجب أن يذكر:

```txt
STAGE
AGENT
REPOSITORY / BRANCH / HEAD
SCOPE
FILES CHANGED
CONTRACT CONSUMED OR CHANGED
TESTS EXECUTED
RESULTS
LIMITATIONS
PARALLEL WORK PRESERVED
GIT POLICY
VERDICT
ALLOWED NEXT STAGE
```

لا تعلن `PASS`, `READY`, `COMPLETE` أو `RELEASED` بما يتجاوز الأدلة.

---

## 17. الممنوعات الجامعة

ممنوع دون مرحلة وتصريح مناسبين:

- تعديل Odoo أو Flutter.
- اختراع Backend contract أو Permission.
- نقل منطق مالي أو أمني إلى الواجهة.
- SQL أو ORM عام.
- Git bulk staging أو Force push.
- Merge أو Push إلى `main`.
- Vercel Production deployment.
- تغيير Credentials أو إنشاء حساب QA.
- لمس Tenant حي أو بيانات حقيقية.
- إخفاء فشل أو قيد داخل تقرير إيجابي.

---

## 18. المسار المرجعي

```txt
raqeem-context-audit
→ bounded Next.js implementation
→ raqeem-targeted-qa
→ raqeem-git-closure when explicitly authorized
→ independent release stage
```

```txt
Implementation completed
≠ QA passed
≠ Git closed
≠ Released
≠ Production verified
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
