# SSC-API-2026.07.001 — Main Baseline Compatibility Contract

Baseline metadata linking **school-nexjs** `origin/main` to the closed Odoo
`smart_school_connect` contract on Odoo `origin/main`. This document is the
human-readable source of truth; the machine-readable mirror lives in
`src/config/backend-contract.ts`.

**Phase:** `NEXTJS-BACKEND-CONTRACT-MAIN-BASELINE-2026-07-001`  
**Last updated:** 2026-07-01

---

## Contract summary

| Field | Value |
|-------|-------|
| **Contract ID** | `SSC-API-2026.07.001` |
| **Frontend release** | `school-nextjs-v2026.07.001` |
| **Required backend contract** | `SSC-API-2026.07.001` |
| **Odoo repository** | https://github.com/geniustep/smart-school-connect.git |
| **Odoo main commit** | `5df044d0d2064f58ddd96c6dea13a12c995fbb63` |
| **Odoo module** | `smart_school_connect` |
| **Odoo module version** | `18.0.1.0.151` (informational only) |
| **Compatible backend** | `origin/main @ 5df044d0d2064f58ddd96c6dea13a12c995fbb63 only` |
| **Min Odoo version** | TBD / `null` |
| **Max Odoo version** | TBD / `null` |
| **Backend upgrade required** | No |
| **Breaking API changes** | No |
| **API prefix** | `/api/v1` |
| **Total routes documented by Odoo** | 380 |
| **Odoo touched** | No |
| **Flutter touched** | No |
| **Next.js main commit** | `22646a05a27c89196fe72d4be3df4d76236eb0d8` |

---

## Purpose

This contract establishes the **first documented baseline** between
school-nexjs and Odoo. It pins compatibility to a single authoritative pair:

- **Next.js:** `origin/main` at the commit recorded above.
- **Odoo:** `origin/main` at commit `5df044d0d2064f58ddd96c6dea13a12c995fbb63`.

The Odoo commit is authoritative. The Odoo module version (`18.0.1.0.151`) is
**informational only** and must not be used alone to infer compatibility.

This contract does **not** change API behaviour, add runtime checks, or modify
Odoo, Flutter, BFF, routes, or deployment targets.

---

## Baseline scope and limitations

- **Baseline only:** This document records a point-in-time alignment between
  two `main` branches. It does **not** guarantee compatibility with older or
  newer Odoo builds outside the pinned commit.
- **No version range yet:** `minBackendVersion` and `maxBackendVersion` remain
  `null` / TBD until a dedicated Odoo compatibility audit widens the range.
- **Authoritative Odoo contract:** Full route documentation lives in the Odoo
  repository at `docs/contracts/SSC-API-2026.07.001.md` on the pinned commit.

---

## Notes

- Reference branches: **Next.js `origin/main` only** — not `dev`, not production,
  not Vercel, not live server state.
- Update `REQUIRED_BACKEND_CONTRACT` in `src/config/backend-contract.ts` only
  when a new baseline contract is formally adopted.
- Prior release metadata remains in `docs/contracts/SSC-API-2026.06.001.md` for
  historical reference.

---

## Related files

- Config: `src/config/backend-contract.ts`
- Prior contract: `docs/contracts/SSC-API-2026.06.001.md`
- Odoo contract (external): `docs/contracts/SSC-API-2026.07.001.md` @
  `5df044d0d2064f58ddd96c6dea13a12c995fbb63` in
  https://github.com/geniustep/smart-school-connect.git
