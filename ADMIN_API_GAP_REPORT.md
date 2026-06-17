# Admin API Gap Report

**Project:** `d:\WEBSITE\shcool\school-nexjs`  
**Last updated:** 2026-05-31

---

## Resolved

| Gap | Status | Notes |
|-----|--------|-------|
| **Students create 500** | ✅ **Students create fixed and verified** | Odoo `POST /api/v1/admin/students` fixed. Next.js form sends accepted payload + error mapping. Live-tested with `done` / `admin123`. |
| **Classes create 500** | ✅ **Classes create fixed and verified** | Odoo `POST /api/v1/admin/classes` fixed. Class form loads live levels/teachers/subjects, sends minimal or full payload, error mapping added. Live-tested with `done` / `admin123`. |
| **Students export BFF JSON parse** | ✅ Fixed | BFF streams CSV/file responses; `export-download` handles blob + Content-Disposition. |

---

## Remaining gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| **Student portal routes 404** | Backend | `/student/dashboard`, `/student/timetable`, etc. return 404 on live API. Not introduced by admin work. |
| **Bulk publish exam results** | API | No bulk publish endpoint exposed. |
| **Resource/homework file upload** | API | Attachments not wired in admin forms. |
| **Export with query filters** | Partial | Export buttons call server export; filter params not always forwarded. |
| **Academic years list API** | API | No dedicated endpoint; class form uses optional manual `academic_year_id` only when admin enters it. |
| **Fee plan eligible students** | API | No `GET /admin/finance/fee-plans/{id}/eligible-students`; assignment flow uses `financeStudentsSearch` + client level filter. Duplicate detection at assign time only. |
| **Fee plan assignment preview** | API | No pre-assign installment preview endpoint; UI uses plan line `installment_schedule` when present. |
| **Bulk assign fee plan** | API | No bulk `assign-fee-plan`; Next.js runs sequential `POST /students/{id}/assign-fee-plan` per student. |

---

## Out of scope (unchanged)

- Attendance patch — not modified
- `excused_absence` — not present in `src/`
- Report Cards, Push/JWT — not implemented
- Odoo backend — not modified from this repo
