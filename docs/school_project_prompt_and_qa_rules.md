# School Project Prompt and QA Rules

Guidelines for agents and contributors working on the Smart School Connect Next.js
platform (`school-nexjs`).

**Last updated:** 2026-06-27  
**Phase reference:** `FINANCE-AMENDMENT-SAFETY-CONTRACT-AND-SCHOOL-QA-1`

---

## عقد حماية قواعد بيانات المدارس الرسمية

### Official School Database Safety Contract

**`school` is the only database permitted for testing, QA, smoke, and exploratory
business calls.**

Any tenant tied to an **official production school** (for example `nibras`, or any
official tenant added later) is **out of bounds** for all of the following:

- Automated or manual **testing**
- **Smoke** checks
- **QA** sessions
- Exploratory **preview** / **apply** calls
- **Login** used for QA
- **Reading business data** for verification
- **Probes** against tenant-specific endpoints

After deploy to an official school, the **only** allowed checks are:

- General **service health** (HTTP availability, no widespread 5xx)
- **Logs** review for crashes or unhandled errors — without pulling tenant business payloads
- **No business endpoint calls** against that tenant
- **No reading** of that school's student, finance, or agreement data

### Summary

| Tenant class | Allowed |
|--------------|---------|
| `school` (test / QA database) | Full QA, smoke, preview, apply on **test fixtures only** |
| Official schools (`nibras`, `alwah`, etc.) | Health + crash logs only — **no business data access** |

When in doubt, treat a tenant as **official** and restrict to health checks only.

### Summary (Arabic)

```txt
school = قاعدة الاختبار و QA و smoke الوحيدة

nibras وأي مدرسة رسمية = ممنوع عليها الاختبار وsmoke وQA وpreview/apply تجريبي وlogin QA وقراءة البيانات وprobes

بعد deploy على مدرسة رسمية: التحقق من الخدمة والـ logs فقط — بدون business calls
```

---

## Related conventions

- QA credentials: use `scripts/qa-env.mjs` — never hardcode passwords in scripts or docs.
- **Next.js QA:** use `https://school.raqeem.ma` (DB `school`) only.
- Prefer **short, targeted** QA over full-suite reruns unless a clear technical risk requires more coverage.
- Finance amendment apply QA must use **test fixtures on `school` only** (codes prefixed `QA_AMM_*` or documented QA students), never official-school tenants or unidentified production students.

---

## Related forbidden databases (non-exhaustive)

Do not use for QA/smoke/tests unless a dedicated phase explicitly overrides:

- `nibras`
- `alwah`
- `alwah_test`
- `propanel`
