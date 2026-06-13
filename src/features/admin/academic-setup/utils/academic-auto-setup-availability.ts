import type { SetupReadinessPayload } from '@/types/academic-setup';

const CAPABILITY_ALIAS = 'academic_auto_setup';

function hasSetupCapabilityAlias(capabilities: string[] | undefined): boolean {
  if (!capabilities?.length) return false;
  return capabilities.some((item) => item.trim().toLowerCase() === CAPABILITY_ALIAS);
}

function isLocalDevelopmentOverrideEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ACADEMIC_AUTO_SETUP === '1'
  );
}

/**
 * Feature gating for the academic auto-setup wizard.
 *
 * Source of truth: GET /admin/setup/readiness → data.features.academic_auto_setup
 * Compatibility alias: data.setup_capabilities includes "academic_auto_setup"
 *
 * Development override (local only): NEXT_PUBLIC_ACADEMIC_AUTO_SETUP=1 in NODE_ENV=development
 */
export function isAcademicAutoSetupAvailable(
  readiness: SetupReadinessPayload | null | undefined,
): boolean {
  if (readiness?.features?.academic_auto_setup === true) return true;
  if (readiness?.features?.academic_auto_setup === false) return false;

  if (hasSetupCapabilityAlias(readiness?.setup_capabilities)) return true;

  if (isLocalDevelopmentOverrideEnabled()) return true;

  return false;
}

export function academicAutoSetupUnavailableReasonKey(): string {
  return 'admin.academicSetup.autoSetup.unavailable';
}
