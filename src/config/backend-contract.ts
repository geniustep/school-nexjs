/**
 * Compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Main release: docs/contracts/SSC-API-2026.09.001.md
 * Dev-only billing responsibility: docs/contracts/SSC-API-2026.10.001.md
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

/** Dev-only billing responsibility contract; distinct from main 09.001 authority change. */
export const BILLING_RESPONSIBILITY_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.10.001',
  frontendRelease: 'school-nextjs-v2026.10.001',
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
    'Dev release contract for Billing Responsibility on student create. Renumbered to SSC-API-2026.10.001 to avoid collision with main SSC-API-2026.09.001 (Manual Billing Authority Change). Requires backend module smart_school_connect 18.0.1.0.164+. Stable HTTP errors via response.error.code. Prior contract: SSC-API-2026.08.001.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
export type BillingResponsibilityBackendContract =
  typeof BILLING_RESPONSIBILITY_BACKEND_CONTRACT;
