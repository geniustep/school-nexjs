# SUBJECT ENABLEMENT STAGE O1 — تقرير نهائي (Odoo)

## الحكم
`READY — SUBJECT_LEVEL_ENABLEMENT_ODOO_CONTRACT_IMPLEMENTED_TESTED_CANDIDATE_PUBLISHED_AWAITING_CROSS_STACK_GATE`

## 1. سياق الخادم والمستودع
- Host: `ubuntu-odoo18`
- User: `root`
- UTC: `2026-07-21T01:55:22Z`
- Repository: `/opt/odoo18/custom_models/smart-school-connect`
- Isolated worktree: `/opt/odoo18/dev-worktrees/subject-level-enablement-contract`
- Remote: `origin` → https://github.com/geniustep/smart-school-connect.git
- Branch: `feat/subject-level-enablement-contract`
- Module: `smart_school_connect`

## 2. Baseline
- `origin/main` SHA: `a18e201eb51293ab6ba3edebd51491e9c839a200` (`a18e201` — admissions safe delete)
- Baseline Manifest: `18.0.1.0.235`
- Candidate Manifest: `18.0.1.0.236`
- Nibras runtime noted in prompt: 234 (not upgraded)

## 3. العمل الموازي والعزل
- Main worktree كان غير نظيف (multi-role / active-role WIP) — لم يُمس.
- Worktrees موازية موجودة: teacher-http-234، fin-family-collection، إلخ.
- لا stash / لا reset قسري / لا تعديل production tenants.
- عزل عبر worktree جديدة من `origin/main` + DB اختبار `ssc_subj_enablement_236` (نسخة dump من school ثم حُذفت).

## 4. النماذج والحقول الفعلية
- مصدر الحقيقة: `school.enabled.subject`
- UNIQUE: `(school_id, subject_id[ref], level_id[ref])`
- تعطيل رسمي: `is_active=False` (ليس unlink، وليس `active` المعياري)
- `school_subject_id` → `school.subject` التشغيلي
- لا يوجد `academic_year_id` على enabled row — السنة سياق للمستهلكين/المصفوفة فقط
- Operational API key: school + academic_year(context) + school.level + school.subject

## 5. خريطة consumers (حابسة vs تاريخية)
Active blockers (scoped school/year/level حيث أمكن):
- assignments, offerings, timetable requirements/slots/occurrences
- homework, exams, gradebooks
- deliveries, jathatha, journal entries, progress

Historical counts تُعرض في summary دون منع التعطيل.

Conflict code: `subject_level_enablement_has_active_consumers`

## 6. عقد GET
`GET /api/v1/admin/subjects/enablement`
Params: `academic_year_id` (أو السنة الحالية), `level_id?`, `subject_id?`
لا `school_id` حر — من session/actor.
Caps: `subject.enablement.view` أو `view_classes`

## 7. عقد POST bulk update
`POST /api/v1/admin/subjects/enablement/update`
Allowlist: academic_year_id, level_id, enable_subject_ids, disable_subject_ids, expected_version
Caps: `subject.enablement.manage` أو `manage_classes`
Savepoint + advisory lock على (school, year, level)
All-or-nothing + preflight consumers قبل أي mutation

## 8. قواعد enable/reactivate/disable
- A already active → noop
- B inactive row → reactivate same ID, preserve plan fields
- C create enabled row; لا إنشاء school.subject / timetable / assignment / offering
- disable → is_active=False + إزالة من level.subject_ids إن أمكن؛ لا unlink

## 9. Consumer safety
Helper مركزي: `evaluate_disable_consumers`
يعيد can_disable / disable_block_code / active+historical counts / يُدمج في serializer + allowed_actions

## 10. Advisory lock / atomicity
`_enablement_lock_keys` + `pg_advisory_xact_lock` (بدون Python hash)
Preflight disables → ثم mutations مرتبة
HTTP: `run_enablement_mutation` داخل savepoint (نمط 234)

## 11. RBAC
قدرات جديدة manager_inherited:
- subject.enablement.view
- subject.enablement.manage
مع alias لـ view_classes / manage_classes
لا توسيع صلاحيات أستاذ/ولي أمر

## 12. Error mapping
401/403/404/409/422/400 JSON عبر mapper موحّد
409: active consumers / version / duplicate race

## 13. Serializer
`serialize_enablement_cell` + matrix payload مع plan NULL محفوظة وlegacy_coefficient=1.0 موثّق

## 14. File scope
- smart_school_connect/__manifest__.py (236)
- smart_school_connect/data/school_subject_enablement_capabilities.xml (new)
- smart_school_connect/models/school_subject_enablement_api.py (new)
- smart_school_connect/models/__init__.py
- smart_school_connect/models/school_admin_capability.py
- smart_school_connect/controllers/admin_subjects_enable.py
- smart_school_connect/controllers/helpers.py (ROLE_PERMISSIONS)
- smart_school_connect/tests/__init__.py
- smart_school_connect/tests/test_school_subject_enablement_contract.py (new)
- smart_school_connect/tests/test_admin_subjects_enablement_http.py (new)
لا migration schema (لا حاجة؛ قدرات عبر XML data)

## 15. الاختبارات
- Enablement suites: **44 tests, 0 failed, 0 errors**
- Regression (enable + enable_http + plan_2b): **24 tests, 0 failed, 0 errors**

## 16. Regression
عقود قائمة محفوظة: options / enable / plan update (مختبرة)

## 17. Dry-run upgrade
- DB معزولة من dump(school) → upgrade 235→236
- module installed 18.0.1.0.236
- routes registered (controller)
- no duplicate enabled keys
- capabilities موجودة
- DB حُذفت بعد التوثيق

## 18. Synthetic matrix
داخل savepoint ثم rollback:
enable → repeat noop → disable → reactivate → blocked mixed update → GET/RBAC → FORCE_ROLLBACK
`SYNTHETIC_MATRIX_OK`

## 19. Git candidate
- Branch: `feat/subject-level-enablement-contract`
- SHA: `dd87c692be0542369715e2e90fb5b47ed0421899`
- Remote: `origin/feat/subject-level-enablement-contract` (= local)
- Worktree نظيفة بعد الدفع
- لم يُدفع إلى `main`

## 20. عدم لمس production
لم تُرقَّ: school runtime / nibras / alwah / ahlen

## 21. المرحلة التالية
1. Cross-stack gate مع Next.js candidate `8d05187`
2. اختبارات معزولة مشتركة
3. Git closure إلى main
4. ترقية school ثم نبراس بتفويض مستقل

## 22. الحكم النهائي
`READY — SUBJECT_LEVEL_ENABLEMENT_ODOO_CONTRACT_IMPLEMENTED_TESTED_CANDIDATE_PUBLISHED_AWAITING_CROSS_STACK_GATE`
