/**
 * Baseline compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Documented in docs/contracts/SSC-API-2026.07.001.md.
 * Not wired to runtime checks — metadata only.
 */
export const REQUIRED_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.07.001',
  frontendRelease: 'school-nextjs-v2026.07.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '5df044d0d2064f58ddd96c6dea13a12c995fbb63',
  backendModuleVersion: '18.0.1.0.151',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'origin/main @ 5df044d0d2064f58ddd96c6dea13a12c995fbb63 only',
  apiPrefix: '/api/v1',
  source: 'main-baseline',
  notes:
    'Baseline compatibility contract based only on Odoo origin/main and Next.js origin/main. The Odoo commit is authoritative; module version is informational only. Version range must be widened only after a dedicated Odoo compatibility audit.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
