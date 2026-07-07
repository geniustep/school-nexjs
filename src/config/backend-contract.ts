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
  backendMainCommit: 'a485105',
  backendModuleVersion: '18.0.1.0.166',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect commit a485105 or newer (module 18.0.1.0.166+); production Server 2 verified at 2b4dc28',
  apiPrefix: '/api/v1',
  source: 'main-release',
  notes:
    'Main release contract for Manual Billing Authority Change on student finance workspace. Requires backend module smart_school_connect 18.0.1.0.166+. Preview/apply via preview_token. Stable HTTP errors via response.error.code. Prior contract: SSC-API-2026.08.001.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
