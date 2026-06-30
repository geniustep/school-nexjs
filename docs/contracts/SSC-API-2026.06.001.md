# SSC-API-2026.06.001 — Release Compatibility Contract

Lightweight metadata linking this **school-nexjs** release to the Odoo
`smart_school_connect` module. This document is the human-readable source of
truth; the machine-readable mirror lives in `src/config/backend-contract.ts`.

**Phase:** `NEXTJS-MAIN-RELEASE-CONTRACT-METADATA-1`  
**Last updated:** 2026-06-30

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.06.001` |
| **Frontend release** | `school-nextjs-v2026.06.001` |
| **Odoo module** | `smart_school_connect` |
| **Min Odoo module version** | TBD |
| **Max Odoo module version** | TBD |

---

## Purpose

Each `main` release of school-nexjs should declare which Odoo module version
range it was built and validated against. This contract does **not** change API
behaviour, add runtime checks, or modify Odoo, Flutter, or deployment targets.

---

## Notes

- Odoo module version bounds are **not yet confirmed** for this release.
- Update `minBackendVersion` / `maxBackendVersion` in
  `src/config/backend-contract.ts` once a validated Odoo build is recorded.
- Frozen Odoo API v1 semantics remain governed by `API_REPORT.md`.

---

## Related files

- Config: `src/config/backend-contract.ts`
- API reference: `API_REPORT.md` (repository root)
