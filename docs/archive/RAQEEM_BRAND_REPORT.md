# تقرير اعتماد الهوية التسويقية — رَقِيم / Raqeem

**التاريخ:** 2026-06-09  
**المشروع:** `D:\app\school-nexjs`  
**النطاق:** عناصر الواجهة المشتركة فقط (بدون تغيير تقني)

---

## 1. الملفات المعدّلة والمضافة

### مضافة
| الملف | الغرض |
|-------|--------|
| `src/lib/fonts.ts` | تحميل خطوط Plus Jakarta Sans و IBM Plex Sans Arabic عبر `next/font` |
| `src/components/brand/brand-logo.tsx` | مكوّن العلامة المركزي (نسخة كاملة / مختصرة) |

### معدّلة
| الملف | التغيير |
|-------|---------|
| `src/app/layout.tsx` | metadata + متغيرات الخطوط على `<body>` |
| `src/app/globals.css` | توكنات Raqeem، ألوان، خطوط، شعار نصي، تسجيل الدخول |
| `src/app/admin-workspace.css` | ألوان لوحة الإدارة |
| `src/app/teacher-workspace.css` | خلفية شريط العلامة للأستاذ |
| `src/components/layout/app-shell.tsx` | استبدال «Smart School Connect» بـ `<BrandLogo />` |
| `src/features/auth/login-form.tsx` | شعار تسجيل الدخول عبر `<BrandLogo />` |
| `messages/ar.json` | مفتاح `brand` + تحديث `auth.brand` |
| `messages/en.json` | مفتاح `brand` + تحديث `auth.brand` |
| `messages/fr.json` | مفتاح `brand` + تحديث `auth.brand` |
| `messages/es.json` | مفتاح `brand` + تحديث `auth.brand` |

---

## 2. مواضع الاسم القديم التي تم استبدالها

| الموقع | قبل | بعد | التصنيف |
|--------|-----|-----|---------|
| `app-shell.tsx` — sidebar | `Smart School` + `Connect` | `رَقِيم` / `Raqeem` (حسب اللغة) | تسويقي ✓ |
| `login-form.tsx` — بطاقة الدخول | `S` + `auth.brand` = Smart School Connect | `<BrandLogo />` | تسويقي ✓ |
| `layout.tsx` — metadata | Smart School Connect | رَقِيم — Raqeem | تسويقي ✓ |
| `messages/*/auth.brand` | Smart School Connect | رَقِيم (ar) / Raqeem (fr/en/es) | تسويقي ✓ |
| `globals.css` — تعليق الرأس | Smart School Connect | Raqeem | تعليق داخلي |

---

## 3. المواضع التقنية التي بقيت دون تغيير

| الموقع | السبب |
|--------|--------|
| `package.json` → `name: school-nexjs` | معرّف تقني للحزمة |
| `package.json` → `description` | وثائق تقنية (خارج نطاق الواجهة) |
| `src/lib/api/endpoints.ts` → تعليق `smart_school_connect` | مرجع وحدة Odoo |
| `ODOO_BACKEND_SYNC.md`, `README.md`, تقارير `*_REPORT.md` | وثائق تقنية/تاريخية |
| `.env.example` | تعليق تقني على API |
| `LOCALE_STORAGE_KEY = 'scc_locale'` | مفتاح تخزين داخلي |
| جميع مسارات `/api/v1`, BFF، cookies، RBAC | خارج النطاق |
| `user.school`, `School #\d+`, `formatSchoolLabel` | سياق مؤسسة تعليمية وليس اسم المنتج |
| `auth.loginLabel`, `you@school.ma` | حقول تقنية/سياق مدرسي |

---

## 4. إدارة الشعار والأصول

### نتيجة الفحص
- **لا توجد** ملفات SVG/PNG/ICO في `public/` أو أي مكان بالمشروع.
- الصورة المرجعية `/mnt/data/raqeem.png` **غير متوفرة** في بيئة التنفيذ.
- **لا يوجد** `manifest.json` أو PWA icons.

### القرار المعتمد
- **لم يُنشأ** شعار تقريبي بـ CSS ولا SVG يحاكي الشعار الرسمي.
- **البديل المؤقت:** مونوغرام نصي (`ر` بالعربية، `R` باللاتينية) داخل `.brand-mark` + اسم المنتج من i18n.
- عند توفير أصول رسمية (SVG أفقي + رمز مختصر + favicon)، يُحدَّث `BrandLogo` فقط دون تغيير routing أو API.

---

## 5. الألوان والخطوط المعتمدة

### توكنات CSS (`:root`)
```css
--raqeem-primary:    #243B6B;
--raqeem-secondary:  #24A6A1;
--raqeem-accent:     #F2A541;
--raqeem-background: #F6F8FC;
```

### التوزيع
- **~60%** أزرق أساسي + محايدات (`--c-bg`, `--c-surface`, `--c-navy`, `--c-primary`)
- **~30%** تركواز ثانوي (`.brand-mark`, حدود التنقل النشط، spinner)
- **~10%** ذهبي إبراز (`sidebar__scope-label` فقط — ليس أزرارًا ولا مساحات كبيرة)

### الخطوط (`next/font`, `display: swap`)
| السياق | الخط | Fallback |
|--------|------|----------|
| RTL (عربية) | IBM Plex Sans Arabic | Cairo, Arial, sans-serif |
| LTR (fr/en/es) | Plus Jakarta Sans | Inter, Arial, sans-serif |

---

## 6. سلوك العربية واللغات اللاتينية

| اللغة | `brand.name` | المونوغرام | الاتجاه |
|-------|--------------|------------|---------|
| `ar` | رَقِيم | ر | RTL |
| `en` | Raqeem | R | LTR |
| `fr` | Raqeem | R | LTR |
| `es` | Raqeem | R | LTR |

- **لا يُعرض** الاسمان معًا في واجهة واحدة؛ يختار `BrandLogo` حسب `locale`.
- `metadata` ثابتة ثنائية اللغة في `layout.tsx` (عنوان التبويب قبل hydration).

---

## 7. نتائج `typecheck`

```
npm run typecheck
✓ tsc --noEmit — نجح بدون أخطاء
```

---

## 8. نتائج `build`

```
npm run build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (50/50)
```

---

## 9. نتائج QA حسب الأدوار

| السيناريو | الحالة | الملاحظة |
|-----------|--------|----------|
| تسجيل الدخول | ✓ | `BrandLogo` + ألوان Raqeem |
| الإدارة (admin) | ✓ | sidebar + `--admin-accent` محدّث |
| الأستاذ (teacher) | ✓ | `sidebar--teacher` بخلفية primary |
| ولي الأمر (parent) | ✓ | نفس `AppShell` |
| التلميذ (student) | ✓ | نفس `AppShell` |
| العربية RTL | ✓ | `رَقِيم` + IBM Plex Arabic |
| الإنجليزية/الفرنسية LTR | ✓ | `Raqeem` + Plus Jakarta Sans |
| Sidebar مفتوح | ✓ | علامة كاملة (مونوغرام + اسم) |
| Sidebar منهار | — | غير مطبّق في المشروع حاليًا؛ `variant="compact"` جاهز |
| شعار على خلفية فاتحة (login) | ✓ | نص primary على `--raqeem-background` |
| شعار على خلفية داكنة (sidebar) | ✓ | نص أبيض على `--raqeem-primary` |
| عدم ظهور الاسم القديم | ✓ | لا «Smart School Connect» في `src/` أو `messages/` |
| RBAC / navigation | ✓ | لم يُمس |
| صور مكسورة / stretching | ✓ | لا صور شعار — نص فقط |

> **ملاحظة:** QA بصري تفاعلي (متصفح حي) لم يُنفَّذ في هذه الجلسة؛ التحقق عبر build + مراجعة الكود.

---

## 10. القيود والأصول الناقصة

1. **شعار SVG/PNG رسمي** — غير موجود؛ مطلوب من فريق الهوية.
2. **favicon / app icons** — غير محدّثة (لا أصول مناسبة).
3. **PWA manifest** — المشروع لا يستخدمه حاليًا.
4. **شاشة splash / loading مخصصة** — غير موجودة؛ يُستخدم `LoadingState` العام فقط.
5. **شاشة اختيار الدور** — غير موجودة؛ التحويل بعد الدخول عبر `homeForRole()` كما كان.
6. **صورة المرجع** `raqeem.png` — لم تُقرأ؛ لا يمكن مطابقة الشكل البصري الدقيق.

---

## 11. `git diff --stat`

```
 messages/ar.json                    |  6 ++-
 messages/en.json                    |  6 ++-
 messages/es.json                    |  6 ++-
 messages/fr.json                    |  6 ++-
 src/app/admin-workspace.css         |  6 +--
 src/app/globals.css                 | 82 +++++++++++++++++++++++--------------
 src/app/layout.tsx                  | 11 +++--
 src/app/teacher-workspace.css       |  2 +-
 src/components/layout/app-shell.tsx |  7 +---
 src/features/auth/login-form.tsx    |  4 +-
 10 files changed, 88 insertions(+), 48 deletions(-)
```

(+ ملفان جديدان غير مدرجين في `--stat` لأنهما untracked)

---

## 12. `git status --short`

```
 M messages/ar.json
 M messages/en.json
 M messages/es.json
 M messages/fr.json
 M src/app/admin-workspace.css
 M src/app/globals.css
 M src/app/layout.tsx
 M src/app/teacher-workspace.css
 M src/components/layout/app-shell.tsx
 M src/features/auth/login-form.tsx
?? src/components/brand/
?? src/lib/fonts.ts
?? RAQEEM_BRAND_REPORT.md
```

---

## 13. commit hash

**لم يُنشأ commit** — لم يُطلب صراحةً.

---

## 14. حالة push

**لم يُنفَّذ push** — لم يُطلب صراحةً.
