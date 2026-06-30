/**
 * Release compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Documented in docs/contracts/SSC-API-2026.06.001.md.
 * Not wired to runtime checks — metadata only.
 */
export const BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.06.001',
  frontendRelease: 'school-nextjs-v2026.06.001',
  backendModule: 'smart_school_connect',
  minBackendVersion: 'TBD',
  maxBackendVersion: 'TBD',
  notes:
    'Initial release contract metadata. Odoo smart_school_connect version range pending confirmation.',
} as const;

export type BackendContract = typeof BACKEND_CONTRACT;
