# Restore Admin Portal + RBAC-1 / RBAC-1B — تقرير التسليم

**المشروع:** `d:\app\school-nexjs`  
**التاريخ:** 2026-06-03  
**النطاق:** Next.js فقط (بدون Odoo / Flutter)

---

## 1. هل كانت التعديلات ضائعة؟

| البند | الحالة |
|--------|--------|
| **مركز قيادة المدير (Command Center)** | كانت **غير مُلتزَمة** في git — موجودة كتغييرات محلية من جلسة سابقة، أُعيد استرجاعها من transcript |
| **RBAC Admin-1 (school switcher, permissions, active_school)** | **لم تُلتزَم أبدًا** في `git log` — لا commits بـ RBAC — أُعيد تطبيقها من transcript `ba5e8cd5` + دمج يدوي |
| **ربط actions بـ manage_*** | كان Phase-1 **read-only** (`isAdminReadOnlyPhase() === true`) — **أُلغِي**؛ الأزرار تُظهر حسب `permissions[]` |
| **تعديلات WIP مكسورة** (`use-admin-resource` وهمي) | كانت في working tree — **أُعيدت** من `HEAD` (ليست جزءًا من RBAC) |

**الخلاصة:** نعم — جزء UX المدير كان مفقودًا/مُرجَعًا؛ RBAC لم يكن مدمجًا في المستودع أصلًا.

---

## 2. مصدر الاسترجاع

| المصدر | الملفات |
|--------|---------|
| Transcript Command Center (`0a5633c2`) | `admin-workspace.css`, command-center, attendance ops, nav عمليات |
| Transcript Admin Phase-1 (`ba5e8cd5`) | `normalize-user`, `active-school`, `use-admin-resource`, school switcher, `admin-pages`, permissions موسّعة |
| إعادة تطبيق يدوي | دمج dashboard + RBAC، إصلاح server/BFF، `phase.ts` → mutations مفعّلة، قنوات admin |

---

## 3. `active_school_id` — التخزين والتمرير

| الطبقة | السلوك |
|--------|--------|
| Cookie | `scc_active_school` (httpOnly) عبر `POST /api/auth/active-school` |
| التحقق | `isActiveSchoolAllowed()` — مدرسة غير مسموحة → **403** بدون fallback |
| Server `getCurrentUser()` | `normalizeMeUser` + `applyActiveSchoolToUser` |
| BFF `GET/POST /api/odoo/admin/*` | يحقن `active_school_id` من cookie |
| Client `useAdminResource` | يضيف `active_school_id` من `AdminSessionProvider` |
| School switcher | يظهر فقط إذا `school_ids.length > 1` |

---

## 4. صفحات `/admin` — قبل / بعد

| المسار | قبل | بعد |
|--------|-----|-----|
| `/admin/dashboard` | إحصائيات قديمة أو read-only فقط | **Command Center** + `view_dashboard` + `useAdminResource` |
| `/admin/students` … | `useResource` بدون مدرسة نشطة | `useAdminResource` + `AdminPageGuard` + actions بـ `manage_*` / `export_data` |
| `/admin/attendance` | إنجليزي / بدون today افتراضي | عمليات يومية + `manage_attendance` للتصحيح |
| `/admin/channels` | قد تستخدم `/channels` | **`/admin/channels`** + `send_messages` |
| باقي القوائم | نفس الصفحات | محفوظة — لم تُحذف |

---

## 5. جدول endpoints (إدارة)

| الصفحة | Endpoint أساسي |
|--------|----------------|
| Dashboard | `GET /admin/dashboard` |
| Students | `GET /admin/students`, export/import, CRUD |
| Parents | `GET /admin/parents` |
| Teachers | `GET /admin/teachers` |
| Classes / Levels / Subjects | `GET /admin/classes`, `/admin/levels`, `/admin/subjects` |
| Attendance | `GET /admin/attendance`, `POST /admin/attendance/correct` |
| Channels | `GET /admin/channels`, `GET/POST /admin/channels/{id}/messages` |
| Homeworks / Resources / Exams / Results | `/admin/homeworks`, `/admin/resources`, `/admin/exams`, `/admin/exam-results` |
| Timetable | `GET /admin/timetable`, slots CRUD |

**ممنوع في admin UI:** `/teacher/*`, `/parent/*`, `/student/*`, `/channels` العامة.

---

## 6. جدول permissions — صفحات

| الصفحة | Permission عرض |
|--------|----------------|
| Dashboard | `view_dashboard` |
| Students | `view_students` |
| Parents | `view_parents` |
| Teachers | `view_teachers` |
| Classes / Levels / Subjects | `view_classes` |
| Attendance | `view_attendance` |
| Channels | `view_channels` |
| Homeworks | `view_homeworks` |
| Resources | `view_resources` |
| Exams | `view_exams` |
| Exam results | `view_exam_results` |
| Timetable | `view_timetable` |

التنفيذ: `nav-config.ts` + `AdminPageGuard` + `RequireAdminPermission`.

---

## 7. جدول permissions — actions (أمثلة)

| Action | Permission |
|--------|------------|
| إضافة/تعديل طالب | `manage_students` |
| تصدير CSV | `export_data` |
| استيراد CSV | `import_data` |
| تصحيح حضور | `manage_attendance` |
| إرسال رسالة | `send_messages` |
| publish homework | `manage_homeworks` (workflow buttons — ما زالت بدون فحص صريح لكل زر؛ الخادم يفرض) |
| جدول الحصص edit/archive | `manage_timetable` |

**qa.staff:** يرى Students فقط؛ لا export/import/manage على القوائم.

---

## 8. معالجة 403 / أخطاء

| الحالة | UI |
|--------|-----|
| `permission_denied` / `forbidden` | `PermissionDeniedState` عبر `ApiErrorView` |
| `unauthenticated` | `SessionExpiredState` → logout |
| مدرسة متعددة بدون اختيار | `NoActiveSchoolState` |
| `active_school_id` غير مسموح (API) | 403 — **لا fallback** لمدرسة أخرى |

---

## 9. QA — متوقع (يتطلب تشغيل يدوي ضد Odoo)

| الحساب | المتوقع |
|--------|---------|
| **qa.pm** | Switcher 9/10؛ قوائم حسب المدرسة؛ 999 → Forbidden |
| **qa.schoolmgr** | مدرسة 10 فقط؛ 9 → Forbidden |
| **qa.supervisor** | صفحات/أزرار حسب scope + permissions |
| **qa.staff** | Students فقط؛ Forbidden على الباقي؛ لا import/export |
| **done** | legacy scope + permissions |
| **qa.teacher/parent/student** | لا `/admin`؛ بواباتهم دون تغيير مسار |

> لم يُشغَّل login حيّ في هذه الجلسة — يُوصى باختبار يدوي بالحسابات أعلاه.

---

## 10. Build / Typecheck

| الفحص | النتيجة |
|--------|---------|
| `npm run typecheck` | ✅ نجح |
| `npm run build` | ✅ نجح (45 مسارًا) |

---

## 11. ما زال يحتاج ربطًا أدق (اختياري لاحقًا)

| البند | السبب |
|--------|--------|
| `HomeworkWorkflowActions` / exam workflow | أزرار publish/archive بدون `hasPermission` لكل زر في الواجهة (الخادم يمنع) |
| `print_documents` / `manage_complaints` | لا واجهة مخصصة بعد في المشروع — **لم تُخترَع** |
| `view_reports` / `view_attachments` | لا مسار admin مخصص في القائمة |
| صفحات تفاصيل `[id]` | محمية عبر بادئة المسار في `admin-pages.ts`؛ أزرار التعديل في forms تحتاج مراجعة حقل بحقل |
| `/admin/academic` | بدون permission في `ADMIN_PAGE_PERMISSION` — يبقى للتوافق |

---

## 12. هل الواجهة aligned مع RBAC-1B؟

**نعم — على مستوى البنية:** `/me` RBAC، switcher، BFF `active_school_id`, تنقل وأعراض حسب permissions، admin channels، Command Center + صفحات كاملة (ليست read-only shell).

**جاهز لتحسين UX المدير** بعد smoke test يدوي على qa.pm / qa.staff.

---

## 13. ملفات رئيسية مُضافة/مُعدّلة

`src/types/user.ts`, `src/types/permissions.ts`, `src/lib/auth/normalize-user.ts`, `src/lib/auth/active-school.ts`, `src/lib/api/server.ts`, `src/app/api/odoo/[...path]/route.ts`, `src/app/api/auth/active-school/route.ts`, `src/lib/hooks/use-admin-resource.ts`, `src/features/auth/admin-session-context.tsx`, `src/components/admin/school-switcher.tsx`, `src/components/admin/require-admin-permission.tsx`, `src/components/admin/admin-page-guard.tsx`, `src/lib/permissions/admin-pages.ts`, `src/lib/permissions/scope.ts`, `src/components/layout/portal-layout.tsx`, `src/components/layout/app-shell.tsx`, `src/components/navigation/nav-config.ts`, `src/lib/api/channel-endpoints.ts`, `src/lib/api/endpoints.ts` (admin channels), `src/app/admin/*`, `src/features/admin/command-center/*`, `src/app/admin-workspace.css`, `messages/*.json`, `ADMIN_PHASE1_REPORT.md`.
