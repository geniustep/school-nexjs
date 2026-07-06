/**
 * Compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Documented in docs/contracts/SSC-API-2026.09.001.md.
 * Not wired to runtime checks — metadata only.
 */
export const REQUIRED_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.09.001',
  frontendRelease: 'school-nextjs-v2026.09.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '98a80915c0494d9a52861ef3c091589abef8ff8e',
  backendModuleVersion: '18.0.1.0.164',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect commit 98a80915c0494d9a52861ef3c091589abef8ff8e or newer (module 18.0.1.0.164+)',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Dev release contract for Billing Responsibility on student create. Requires backend module smart_school_connect 18.0.1.0.164+. Stable HTTP errors via response.error.code. Prior contract: SSC-API-2026.08.001.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
