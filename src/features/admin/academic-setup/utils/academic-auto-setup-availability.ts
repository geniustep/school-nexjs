import type { AcademicSetupFeatures } from '@/types/academic-initialize';
import type { LevelOptionsPayload } from '@/types/academic-levels';
import type { SetupReadinessPayload } from '@/types/academic-setup';

const CAPABILITY_KEYS = [
  'academic_auto_setup',
  'setup_academic_initialize',
  'admin/setup/academic/initialize',
] as const;

function hasCapability(capabilities: string[] | undefined): boolean {
  if (!capabilities?.length) return false;
  const normalized = capabilities.map((item) => item.trim().toLowerCase());
  return CAPABILITY_KEYS.some((key) => normalized.includes(key.toLowerCase()));
}

function readFeatureFlag(features: AcademicSetupFeatures | undefined): boolean | null {
  if (features?.academic_auto_setup === true) return true;
  if (features?.academic_auto_setup === false) return false;
  return null;
}

/** Safe gating — only enable wizard when backend explicitly advertises the contract. */
export function isAcademicAutoSetupAvailable(
  options: LevelOptionsPayload | null | undefined,
  readiness: SetupReadinessPayload | null | undefined,
): boolean {
  const fromOptions = readFeatureFlag(options?.features);
  if (fromOptions === true) return true;
  if (fromOptions === false) return false;

  const fromReadiness = readFeatureFlag(readiness?.features);
  if (fromReadiness === true) return true;
  if (fromReadiness === false) return false;

  if (hasCapability(options?.setup_capabilities)) return true;
  if (hasCapability(readiness?.setup_capabilities)) return true;

  if (process.env.NEXT_PUBLIC_ACADEMIC_AUTO_SETUP === '1') return true;

  return false;
}

export function academicAutoSetupUnavailableReasonKey(): string {
  return 'admin.academicSetup.autoSetup.unavailable';
}
