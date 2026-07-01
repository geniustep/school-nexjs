/**
 * Compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Documented in docs/contracts/SSC-API-2026.08.001.md.
 * Not wired to runtime checks — metadata only.
 */
export const REQUIRED_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.08.001',
  frontendRelease: 'school-nextjs-v2026.08.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '1f45edcb82a598378807901c68a9be1119dac944',
  backendModuleVersion: '18.0.1.0.154',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect commit 1f45edcb82a598378807901c68a9be1119dac944 or newer',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Dev release contract after syncing main baseline (SSC-API-2026.07.001). Covers admissions reopen, guardian relationship detach, and student edit UI. Backend upgrade required for reopen/detach actions; no breaking API changes when UI uses allowed_actions graceful fallback. Odoo commit is authoritative; module version is informational only.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
