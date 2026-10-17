# تنفيذ واجهة المصاريف

- STAGE: NEXTJS-EXPENSES-UI-CONTRACT-COMPLETION-20261017
- AGENT: RAQEEM_NEXTJS_AGENT
- REPOSITORY: geniustep/school-nexjs
- BRANCH: feat/expenses-ui-contract-completion-20261017
- BASE: db1fdca26214ed27d0df2654c1f43af6e8f61990 (dev)
- GIT POLICY: explicit frontend publication authorized; scoped feature branch and review PR only until backend dependency is available.
- CONTRACT: SSC-API-2026.10.002, expenses-draft-v1; latest completion supplied directly by project owner in this conversation.

## المنفذ

قائمة وترقيم وفلاتر الخادم؛ إنشاء مسودة وتعديلها بversion؛ إرسال ورفض وإلغاء وفق الصلاحيات الفعلية وallowed_actions؛ مفاتيح إعادة محاولة ثابتة للإنشاء والتحولات؛ تصنيفات وparent/sequence وأرشفة؛ موردون مرتبطون وبحث eligible وربط partner_id المختار فقط؛ الجاهزية مستقلة بصلاحية finance.view.

العملة من bootstrap.currency مباشرة دون reference-data أو توسيع صلاحيات المالية. يغلق الحفظ عند غيابها. البحث eligible يتطلب mode echo صريحًا قبل عرض أزرار الربط؛ لا يسمح بإدخال معرف عشوائي. المدرسة في session/query ولا يحقنها BFF في حقول mutation.

أربع لغات؛ لوحة جانبية على سطح المكتب ونافذة modal على الهاتف؛ إغلاق وEscape؛ حماية الاستجابات عند تبديل المدرسة أو مغادرة المكون. لا محاسبة أو أداء أو تصدير. لا علامة اعتماد تصميم نهائية.

## الأدلة والحدود

- 18 اختبارًا موجهًا ناجحًا: model 10، workspace integration 4، transport 2، readiness copy 2. آخر تشغيل بعد تعديل النسخ والنموذج شمل الملفين المتغيرين فقط (14 اختبارًا).
- فحص TypeScript النهائي: ناجح، exit 0 بعد إضافة الاختبارات الأربعة.
- Browser fixture: عرض الموردين والبحث والربط ورسالة نجاح؛ نموذج إنشاء بعملة MAD؛ العربية RTL والفرنسية LTR؛ نموذج هاتف في iframe بعرض 390 وارتفاع 844. البيانات اصطناعية وطبقة المصادقة مستبدلة في المعاينة فقط.
- لم يُجر smoke مصادق على التطبيق المتكامل، ولم تُكتب بيانات إنتاجية.
- تقرير الخلفية الوارد من المالك: 9/9 في قاعدة مؤقتة؛ لم تُعد تلك الاختبارات هنا.
- عند الفحص، عقد backend main على GitHub لا يتضمن إضافات currency/eligible بعد؛ نسخة المالك المحلية غير ملتزمة بحسب تقريره. يمنع ذلك إعلان الجاهزية التشغيلية أو اكتمال النشر.
- الملفات القديمة محفوظة؛ نسخة Git الأصلية فقدت metadata فاستُعيد clone نظيف من dev، ونُقلت ملفات المصاريف فقط. لم يُعدل عمل الجداول أو المالية الموازي.

## الخطوة التالية

دفع تحديث الخلفية المعتمد وتفعيله في البيئة المستهدفة بواسطة مسارها المصرح، ثم تأكيد الربط في البيئة المتكاملة قبل دمج الواجهة dev ثم main. لا ترقية خلفية أو تعديل قاعدة بيانات ضمن هذه المهمة.
