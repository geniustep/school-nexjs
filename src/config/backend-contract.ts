/**
 * Compatibility metadata for school-nexjs ↔ Odoo `smart_school_connect`.
 *
 * Main release: docs/contracts/SSC-API-2026.09.001.md
 * Billing responsibility: docs/contracts/SSC-API-2026.10.001.md
 * Guardian onboarding: docs/contracts/SSC-API-2026.11.001.md
 * Guardian password setup: docs/contracts/SSC-API-2026.12.001.md
 * Continuous assessment gradebook: docs/contracts/SSC-API-2026.13.001.md
 * Continuous assessment gradebook results: docs/contracts/SSC-API-2026.14.001.md
 * Class multi-subject results: docs/contracts/SSC-API-2026.15.001.md
 * Student multi-subject assessment summary: docs/contracts/SSC-API-2026.16.001.md
 * Guardian identity document: SSC-API-2026.07.003
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

/** Guardian identity document UI/search; SSC-API-2026.07.003 / module 18.0.1.0.168+. */
export const GUARDIAN_IDENTITY_DOCUMENT_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.07.003',
  frontendRelease: 'school-nextjs-v2026.07.003',
  backendModule: 'smart_school_connect',
  backendMainCommit: null,
  backendModuleVersion: '18.0.1.0.168',
  minBackendVersion: '18.0.1.0.168',
  maxBackendVersion: null,
  compatibleBackend: 'smart_school_connect module 18.0.1.0.168+',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Guardian identity document (identity_document_type/number/country, national_id alias, national_id_masked, match_basis=identity_document, matched_on=guardian_identity, 409 guardian_identity_candidate_exists). No new endpoints.',
} as const;

export type GuardianIdentityDocumentBackendContract =
  typeof GUARDIAN_IDENTITY_DOCUMENT_BACKEND_CONTRACT;

/** Continuous assessment gradebook workspace; requires Odoo Gradebook API + create hotfix. */
export const GRADEBOOK_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.13.001',
  frontendRelease: 'school-nextjs-v2026.13.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: 'b2569736c78337b28260fd9682a93262ce4e4935',
  backendModuleVersion: null,
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect Odoo main containing create hotfix b2569736c78337b28260fd9682a93262ce4e4935 (Gradebook API 012b4a98c9c9f64589a986a21d8665c49bdc9e68 is an ancestor)',
  apiPrefix: '/api/v1',
  source: 'main-release',
  notes:
    'Continuous assessment gradebook admin workspace (list/create/detail, entries batch, lifecycle) plus Teacher Gradebook UI (list/detail) reusing the shared workspace. Additive endpoints under /admin/assessment/gradebooks and /teacher/assessment/gradebooks. Breaking API changes: none. Backend upgrade required: yes (Odoo main with Gradebook API + create hotfix). Prior contract: SSC-API-2026.12.001.',
} as const;

export type GradebookBackendContract = typeof GRADEBOOK_BACKEND_CONTRACT;

/** Continuous assessment gradebook Results view; requires Odoo Results API. */
export const GRADEBOOK_RESULTS_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.14.001',
  frontendRelease: 'school-nextjs-v2026.14.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '16189fedee43b3a4f8cab7cceba8697023d81f5f',
  backendModuleVersion: null,
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect Odoo main containing Results API commit 16189fedee43b3a4f8cab7cceba8697023d81f5f or an equivalent descendant',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Continuous assessment gradebook Results View inside shared Gradebook Detail Workspace (admin + teacher). Additive GET …/gradebooks/{id}/results endpoints. No frontend formula recalculation. Breaking API changes: none. Backend upgrade required: yes for environments without 16189fed or descendant. school runtime already aligned; nibras/alwah not upgraded or verified in this phase. Prior contract: SSC-API-2026.13.001.',
} as const;

export type GradebookResultsBackendContract = typeof GRADEBOOK_RESULTS_BACKEND_CONTRACT;

/** Class multi-subject continuous assessment Results workspace; requires Odoo class Results API. */
export const CLASS_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.15.001',
  frontendRelease: 'school-nextjs-v2026.15.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '61ba696423604ac5b721cbdee8d8a15d99ce4c68',
  backendModuleVersion: null,
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect Odoo main containing Class Multi-Subject Results API commit 61ba696423604ac5b721cbdee8d8a15d99ce4c68 or an equivalent descendant',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Admin Class Multi-Subject Results Workspace (year/term/class selectors, coverage, warnings, student×subject matrix). Additive GET /admin/assessment/classes/{class_id}/results. No frontend recalculation, cross-subject average, or ranking. Breaking API changes: none. Backend upgrade required: yes for environments without 61ba696 or descendant. school runtime already aligned and verified; nibras/alwah not upgraded or verified in this phase. Prior contract: SSC-API-2026.14.001.',
} as const;

export type ClassMultiSubjectResultsBackendContract =
  typeof CLASS_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT;

/** Student 360 multi-subject continuous assessment summary; requires Odoo student Results API. */
export const STUDENT_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.16.001',
  frontendRelease: 'school-nextjs-v2026.16.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: '04eab51208601562f85f5ae3c770537a1d0ee21d',
  backendModuleVersion: null,
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect Odoo main containing Student Multi-Subject Results API commit 04eab51208601562f85f5ae3c770537a1d0ee21d or an equivalent descendant',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Student 360 Academic multi-subject assessment summary (year/term selectors, coverage, warnings, subject result cards). Additive GET /admin/assessment/students/{student_id}/results. No frontend recalculation, overall average, or ranking. Breaking API changes: none. Backend upgrade required: yes for environments without 04eab512 or descendant. school runtime already aligned and verified; nibras/alwah not upgraded or verified in this phase. Prior contract: SSC-API-2026.15.001.',
} as const;

export type StudentMultiSubjectResultsBackendContract =
  typeof STUDENT_MULTI_SUBJECT_RESULTS_BACKEND_CONTRACT;

/**
 * Teacher Domain School API — profiles, academic eligibility, assignments, offerings.
 * Live contract endpoint: GET /api/v1/admin/teacher-domain/contract
 */
export const TEACHER_DOMAIN_BACKEND_CONTRACT = {
  contractId: 'SSC-API-2026.07.001',
  frontendRelease: 'school-nextjs-teacher-domain-v2026.07.001',
  backendModule: 'smart_school_connect',
  backendMainCommit: null,
  backendModuleVersion: '18.0.1.0.231',
  minBackendVersion: null,
  maxBackendVersion: null,
  compatibleBackend:
    'smart_school_connect Teacher Domain School API (contract teacher_domain_school_api / SSC-API-2026.07.001)',
  apiPrefix: '/api/v1',
  source: 'dev-release',
  notes:
    'Teacher Domain adoption for admin Next.js: /admin/teacher-domain/contract, /admin/teachers*, /admin/teachers/{id}/academic-profile, /admin/teaching-assignments*, /admin/teaching-offerings*. Backend-owned allowed_actions, tenant scope, and lifecycle transitions. No generic ORM. Archived offerings remain hidden under default active_test. Prior unrelated baseline doc SSC-API-2026.07.001 remains historical for main baseline; this metadata keys the Teacher Domain runtime contract of the same ID.',
} as const;

export type TeacherDomainBackendContract = typeof TEACHER_DOMAIN_BACKEND_CONTRACT;
