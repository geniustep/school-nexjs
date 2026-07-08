/**
 * Compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Main release: docs/contracts/SSC-API-2026.09.001.md
 * Billing responsibility: docs/contracts/SSC-API-2026.10.001.md
 * Guardian onboarding: docs/contracts/SSC-API-2026.11.001.md
 * Guardian password setup: docs/contracts/SSC-API-2026.12.001.md
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
    'Billing responsibility contract on student create. Renumbered to SSC-API-2026.10.001 to avoid collision with SSC-API-2026.09.001 (Manual Billing Authority Change). Requires backend module smart_school_connect 18.0.1.0.164+. Stable HTTP errors via response.error.code. Prior contract: SSC-API-2026.08.001.',
} as const;

/** Guardian onboarding atomic student create; builds on billing responsibility 10.001. */
export const GUARDIAN_ONBOARDING_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.11.001',
  frontendRelease: 'school-nextjs-v2026.11.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '98a80915c0494d9a52861ef3c091589abef8ff8e',
  backendModuleVersion: '18.0.1.0.164',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect commit 98a80915c0494d9a52861ef3c091589abef8ff8e or newer (module 18.0.1.0.164+)',
  apiPrefix: '/api/v1',
  source: 'reconciled-release',
  notes:
    'Guardian onboarding on atomic POST /api/v1/admin/students: guardian_relationships[], billing_responsibility with billing_guardian_id (school.parent id), guardian code, account.login, account.status, portal user provisioning metadata. No post-201 guardians/link-person. Requires SSC-API-2026.10.001 billing semantics. Prior contract: SSC-API-2026.10.001.',
} as const;

/** Guardian password assign/reset; builds on guardian onboarding 11.001 account identity. */
export const GUARDIAN_PASSWORD_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.12.001',
  frontendRelease: 'school-nextjs-v2026.12.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: null,
  backendModuleVersion: null,
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend: 'smart_school_connect with guardian password assign/reset endpoints',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Guardian password setup UX on parent detail and Student 360. GET /admin/parents/options (password_policy, allowed_parent_actions.account_assign_password), POST /admin/parents/{id}/account with password + password_confirm. Account fields can_assign_password, password_was_set. Requires SSC-API-2026.11.001 guardian account identity. Prior contract: SSC-API-2026.11.001.',
} as const;

export type RequiredBackendContract = typeof REQUIRED_BACKEND_CONTRACT;
export type BillingResponsibilityBackendContract =
  typeof BILLING_RESPONSIBILITY_BACKEND_CONTRACT;
export type GuardianOnboardingBackendContract =
  typeof GUARDIAN_ONBOARDING_BACKEND_CONTRACT;
export type GuardianPasswordBackendContract =
  typeof GUARDIAN_PASSWORD_BACKEND_CONTRACT;
