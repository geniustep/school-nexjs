# N4-J — Subject Level Enablement Cross-Stack Gate (Next.js)

## الحكم النهائي

`PARTIAL — NEXTJS_WRITE_UI_GREEN_LIVE_ODOO_236_CROSS_STACK_GATE_NOT_AVAILABLE`

---

## 1. جهاز التنفيذ والعزل

| Item | Value |
|------|--------|
| Host | GENIUSTEP |
| Repo | `D:/app/school-nexjs` |
| Worktree | `D:/app/dev-worktrees/n4j-subject-level-enablement-write` |
| Branch | `feat/n4j-subject-level-enablement-write` |
| Base (N4-I) | `8d051875d25da6c0043e506ac6fb1934d752351f` |
| Candidate HEAD | `6c3c945e2d871127039a7e981ccf49c5f1b7a556` |
| Parent | `8d051875d25da6c0043e506ac6fb1934d752351f` |
| Tree | `f7ef0264f19dba6df42cd1febffad103ed92c24e` |
| Remote | `origin/feat/n4j-subject-level-enablement-write` |
| Parallel WT | `D:/app/school-nexjs` left dirty — untouched |

## 2. عقد Odoo 236

| Item | Value |
|------|--------|
| Odoo branch | `feat/subject-level-enablement-contract` |
| Odoo SHA | `dd87c692be0542369715e2e90fb5b47ed0421899` |
| Manifest | `18.0.1.0.236` |
| Contract copy used | `.audit-n4j-subject-level-enablement/NEXTJS_CONTRACT_BRIEF.md` |
| Source on Odoo host | `/opt/odoo18/backups/subject-level-enablement-236/NEXTJS_CONTRACT_BRIEF.md` |

### GET (no secrets)

`GET /api/v1/admin/subjects/enablement?academic_year_id?&level_id?&subject_id?`

Response `data` includes: `school`, `academic_year`, `levels`, `operational_subjects`, `items[]`, `counts`, `version`, `permissions.can_view|can_manage`.

### POST (no secrets)

`POST /api/v1/admin/subjects/enablement/update`

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

Success includes `results.{created,reactivated,disabled,noop}` + refreshed matrix slice.

## 3. الصفحات والمكونات

### Settings — `/admin/settings/academic-setup/subjects`

- `LevelEnablementDrawer` + `LevelEnablementMatrixPanel`
- Checkboxes = draft only (no POST)
- Explicit review → confirm save → POST
- Empty enabled state without auto-copy
- Unsaved close / `beforeunload` guards
- 409 consumers → Arabic safety message + server reload (no local disable)

### Subjects — `/admin/subjects`

- `SubjectLevelsEnablementDrawer` uses same `fetchSubjectEnablement` / `updateSubjectEnablement`
- Level-scoped POSTs per dirty level (contract has no subject-centric POST)

### Shared

- `src/features/admin/subject-enablement/api/enablement-api.ts`
- `hooks/use-enablement-matrix.ts`, `use-enablement-draft.ts`
- `utils/enablement-diff.ts`, `map-enablement-errors.ts`, `build-enablement-matrix.ts`
- Endpoints in `src/lib/api/endpoints.ts`

## 4. Feature flag

See `FEATURE_FLAG.md`.

- Name: `NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE`
- Default: off
- Test: `=1` on non-production
- Forced off when `VERCEL_ENV=production`
- Reason: Odoo 236 not on production tenants yet

## 5. نتائج الاختبارات

| Check | Result |
|-------|--------|
| Focused vitest (`src/features/admin/subject-enablement`) | **30 passed** |
| `tsc --noEmit` | **pass** |
| `next build` | **pass** |
| `next lint` (scoped) | **skipped** — no ESLint config in tree; interactive setup prompt only |

## 6. بوابة Cross-stack

| Path | Result |
|------|--------|
| Isolated Odoo 236 DB (`ssc_subj_enablement_236`) | **Not available** (deleted after Odoo O1 dry-run) |
| Live GET/POST against test DB | **Not executed** |
| Contract fixtures from NEXTJS_CONTRACT_BRIEF.md | **Executed** (21 contract tests) |
| Nibras production writes | **Not used** |

→ Therefore **PARTIAL**, not full PASS.

## 7. إثبات عدم النشر / عدم لمس الإنتاج

- No `vercel --prod`
- No push to `main`
- No upgrade of school / nibras / alwah / ahlen
- No writes to nibras production DB
- No user password requested
- Odoo / Flutter untouched
- Original dirty worktree untouched

## 8. محجوب للمرحلة التالية

1. Restore/provision isolated Odoo 236 DB and run live GET/enable/disable/reactivate/409/bulk atomicity gate
2. Flip write flag only after tenant has 236
3. Release planning + Production deploy (out of N4-J scope)
