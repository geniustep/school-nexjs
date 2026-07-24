# Raqeem Local Hook Pilot — school-nexjs

هذه الحزمة Pilot محلية منخفضة الخطر لتطبيق بعض حواجز رقيم داخل `school-nexjs`.

## الحالة

```txt
PILOT — VALIDATED LOCAL OPT-IN
```

وجود الملفات داخل المستودع لا يفعّلها تلقائيًا على جهاز المطور. التفعيل يتم محليًا فقط عبر `git config --local`.

## نتائج التحقق المعتمدة

```txt
SELF-TEST: PASS (9/9)
WARN MODE: VALIDATED
PRE-COMMIT SECRET BLOCK: VALIDATED
ENFORCE ALLOWED SCOPE: VALIDATED
ENFORCE OUTSIDE-SCOPE BLOCK: VALIDATED
TEST HEAD: UNCHANGED
TEST CLEANUP: CLEAN
```

## المكونات

```txt
raqeem-preflight.mjs
→ H01: فحص المستودع والفرع وHEAD ووجود AGENTS وCore Skills

raqeem-command-guard.mjs
→ H02: منع أوامر Git الخطرة الدائمة

raqeem-staged-scope.mjs
→ H06/H07: فحص الأسرار وArtifacts وScope والـcached diff قبل Commit

raqeem-hook-setup.mjs
→ إعداد core.hooksPath ووضع warn أو enforce وScope المرحلة

.githooks/pre-commit
→ يستدعي فحص Staging قبل Commit
```

## 1. فحص السياق

على فرع التطوير:

```powershell
node .agents/hooks/raqeem-preflight.mjs --expect-repo school-nexjs --expect-branch dev
```

على `main` أثناء مرحلة مصرح بها:

```powershell
node .agents/hooks/raqeem-preflight.mjs --expect-repo school-nexjs --expect-branch main
```

الفحص Read-only ولا يغير الملفات أو Git.

## 2. اختبار حارس الأوامر

أمر مسموح:

```powershell
node .agents/hooks/raqeem-command-guard.mjs "git add src/app/page.tsx"
```

أمر محظور:

```powershell
node .agents/hooks/raqeem-command-guard.mjs "git add ."
```

النتيجة المتوقعة للأمر المحظور:

```txt
VERDICT: HARD_BLOCK
REASON: UNSAFE_GIT_BULK_STAGE
```

هذا الحارس لا يعترض Shell تلقائيًا بعد؛ يجب أن تستدعيه أداة الوكيل قبل الأمر إلى أن يتم ربط Runtime Hook رسميًا.

## 3. التفعيل المحلي الآمن

ابدأ بوضع التحذير:

```powershell
node .agents/hooks/raqeem-hook-setup.mjs --mode warn
```

هذا يضبط محليًا:

```txt
core.hooksPath = .githooks
raqeem.hookMode = warn
```

ولا يكتب هذه القيم داخل المستودع أو GitHub.

## 4. ضبط Scope المرحلة

مثال لمسارين صريحين:

```powershell
node .agents/hooks/raqeem-hook-setup.mjs --mode enforce --scope "src/app/admin/example/page.tsx,src/features/example/example.test.tsx"
```

يمكن السماح بمجلد كامل بوضع `/` في النهاية:

```powershell
node .agents/hooks/raqeem-hook-setup.mjs --mode enforce --scope "src/features/example/"
```

تخزن المسارات في Git config المحلي المتكرر:

```txt
raqeem.allowedFile
```

## 5. إزالة Scope بعد الإغلاق

```powershell
node .agents/hooks/raqeem-hook-setup.mjs --clear-scope --mode warn
```

## 6. إيقاف Pilot محليًا

```powershell
node .agents/hooks/raqeem-hook-setup.mjs --mode off
```

هذا يلغي `core.hooksPath` محليًا، ولا يحذف ملفات الحزمة.

## قواعد الفحص قبل Commit

يحظر دائمًا:

- `.env` وملفات المفاتيح الخاصة.
- `*.pem`, `*.key`, `*.p12`, `*.pfx`.
- `node_modules/`, `.next/`, `coverage/` وArtifacts المصنفة.
- أخطاء `git diff --cached --check`.

في وضع `warn`:

- غياب Scope أو وجود ملف خارجه يصدر Warning ولا يمنع Commit.
- الأسرار وArtifacts الحساسة تظل محظورة.

في وضع `enforce`:

- غياب Scope يمنع Commit.
- أي ملف مرحّل خارج Scope يمنع Commit.

## سياسة التشغيل المعتمدة

```txt
الوضع المحلي الافتراضي: warn

عند Git closure مصرح بها:
→ اضبط enforce مع Scope صريح
→ نفذ الإغلاق المصرح فقط
→ امسح Scope
→ ارجع إلى warn
```

نجاح `enforce` تقنيًا لا يمنح إذن Commit أو Push أو Merge أو Release.

## حدود Pilot

هذه الحزمة لا تقوم بـ:

- اعتراض كل أوامر Codex أو Cursor تلقائيًا.
- فحص Secrets داخل محتوى الملفات؛ تفحص أسماء الملفات فقط في V1 Pilot.
- منح إذن Git closure.
- تنفيذ Commit أو Push أو Merge أو Release.
- حماية Odoo أو Flutter بعد؛ Pilot محصور في Next.js.
- استبدال `AGENTS.md` أو Core Skills أو Governance.

## الحكم

```txt
Hook files present
≠ Hook enabled locally

warn mode
→ validated

enforce with explicit scope
→ validated

pre-commit passed
≠ Git closure authorized
```
