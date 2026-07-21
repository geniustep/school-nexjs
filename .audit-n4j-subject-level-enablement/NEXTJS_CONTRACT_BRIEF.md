# Subject Level Enablement — Odoo Contract Brief (for Next.js)

Manifest: `18.0.1.0.236`  
Branch: `feat/subject-level-enablement-contract`  
Auth: admin session + `active_school_id` (no free `school_id` in body)

## Endpoints

### GET `/api/v1/admin/subjects/enablement`
Query:
- `academic_year_id` optional (defaults to current/active year)
- `level_id` optional
- `subject_id` optional (operational `school.subject` id)

Capability: `subject.enablement.view` **or** `view_classes`

Response `data` (abridged):
```json
{
  "school": {"id": 1, "name": "...", "code": "..."},
  "academic_year": {"id": 1, "name": "2025-2026", "code": "...", "is_current": true, "state": "active"},
  "levels": [{"id": 10, "name": "...", "code": "P2", "ref_level_id": 2, "active": true}],
  "operational_subjects": [{"id": 5, "name": "...", "code": "AR_PRIM", "ref_subject_id": 3, "ref_subject_code": "AR_PRIM", "active": true}],
  "items": [{
    "enabled_record_id": 99,
    "operational_subject_id": 5,
    "subject": {"id": 5, "code": "AR_PRIM", "ref_subject_id": 3, "ref_subject_code": "AR_PRIM", "active": true},
    "level": {"id": 10, "code": "P2"},
    "academic_year": {"id": 1},
    "enabled": true,
    "is_active": true,
    "state": "enabled",
    "plan": {"weekly_minutes": null, "assessment_coefficient": null, "legacy_coefficient": 1.0},
    "consumer_summary": {
      "can_disable": true,
      "disable_block_code": null,
      "active_consumer_counts": {"assignments": 0},
      "historical_consumer_counts": {"assignments": 0}
    },
    "allowed_actions": {"view": true, "enable": false, "disable": true, "update": true},
    "write_date": "2026-07-21T01:00:00"
  }],
  "counts": {"levels": 1, "operational_subjects": 3, "enabled": 1, "by_level": []},
  "version": "99:2026-07-21T01:00:00",
  "permissions": {"can_view": true, "can_manage": true}
}
```

Notes:
- Only active operational subjects appear as options (no ref-only).
- Archived enablement (`is_active=false`) ⇒ `enabled=false`, `state="archived"`.
- Plan NULLs stay null; do not coerce to 0.
- `legacy_coefficient` default 1.0 is compatibility-only (not plan coefficients).

### POST `/api/v1/admin/subjects/enablement/update`
Body allowlist only:
```json
{
  "academic_year_id": 1,
  "level_id": 10,
  "enable_subject_ids": [5, 6],
  "disable_subject_ids": [7],
  "expected_version": "99:2026-07-21T01:00:00"
}
```
- IDs are **operational** `school.subject` ids only (not ref ids).
- Arrays unique; max 100; same id cannot be in both lists.
- Capability: `subject.enablement.manage` **or** `manage_classes`

Success `200` `data.results`:
```json
{"created":[5],"reactivated":[6],"disabled":[7],"noop":[]}
```
Plus final level matrix (`items`, `counts`, `version`).

## Error codes
| HTTP | code |
|------|------|
| 401 | unauthorized |
| 403 | forbidden / school_out_of_scope / level_out_of_scope |
| 404 | not_found (scoped missing) |
| 400 | invalid_json |
| 422 | invalid_payload / validation_error / subject_level_enablement_enable_disable_overlap |
| 409 | subject_level_enablement_has_active_consumers |
| 409 | subject_level_enablement_version_conflict |
| 409 | subject_level_enablement_duplicate_conflict |

409 consumer example details:
```json
{
  "operational_subject_id": 5,
  "enabled_record_id": 99,
  "consumer_summary": {
    "can_disable": false,
    "disable_block_code": "subject_level_enablement_has_active_consumers",
    "active_consumer_counts": {"assignments": 1},
    "historical_consumer_counts": {"assignments": 0}
  }
}
```

## Allowed actions
Actor-aware per cell: `view`, `enable`, `disable`, `update`.  
No actor ⇒ view-only. Execution re-checks capability (do not trust stale allowed_actions).

## Existing endpoints unchanged
- `GET /api/v1/admin/subjects/options` (ref catalog options)
- `POST /api/v1/admin/subjects/enable` (enable from reference catalog)
- `POST /api/v1/admin/subjects/plan/update`

## Identity reminder for UI
Enabled-row uniqueness is `(school, ref_subject, ref_level)` — year is consumer/matrix context only.
