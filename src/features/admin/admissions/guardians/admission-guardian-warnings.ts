export const ADMISSION_GUARDIAN_WARNING_CODES = [
  'guardian_identity_missing',
  'guardian_identity_number_missing',
  'guardian_identity_expired',
  'primary_guardian_missing',
  'family_child_without_guardian',
] as const;

export type AdmissionGuardianWarningCode =
  (typeof ADMISSION_GUARDIAN_WARNING_CODES)[number];

const WARNING_MESSAGE_KEYS: Record<AdmissionGuardianWarningCode, string> = {
  guardian_identity_missing: 'admin.admissions.guardians.warnings.identityMissing',
  guardian_identity_number_missing:
    'admin.admissions.guardians.warnings.identityNumberMissing',
  guardian_identity_expired: 'admin.admissions.guardians.warnings.identityExpired',
  primary_guardian_missing: 'admin.admissions.guardians.warnings.primaryMissing',
  family_child_without_guardian: 'admin.admissions.guardians.warnings.childWithoutGuardian',
};

export function isAdmissionGuardianWarningCode(
  code: string,
): code is AdmissionGuardianWarningCode {
  return (ADMISSION_GUARDIAN_WARNING_CODES as readonly string[]).includes(code);
}

/** Identity/structure readiness warnings are non-blocking for initial save. */
export function isAdmissionGuardianWarningBlocking(_code: string): boolean {
  return false;
}

export function admissionGuardianWarningMessageKey(code: string): string | null {
  if (!isAdmissionGuardianWarningCode(code)) return null;
  return WARNING_MESSAGE_KEYS[code];
}

export function translateAdmissionGuardianWarning(
  code: string,
  t: (key: string) => string,
  fallbackMessage?: string | null,
): string {
  const key = admissionGuardianWarningMessageKey(code);
  if (key) return t(key);
  return fallbackMessage?.trim() || code;
}
