/** Public login branding config — no secrets. */

export const loginSchoolBrand = {
  /** School code for Odoo public branding API (default: raqeem). */
  schoolCode:
    process.env.NEXT_PUBLIC_LOGIN_SCHOOL_CODE?.trim() ||
    process.env.LOGIN_SCHOOL_CODE?.trim() ||
    'raqeem',
  /** Optional local override when API unavailable. */
  schoolDisplayName: process.env.NEXT_PUBLIC_LOGIN_SCHOOL_NAME?.trim() || null,
  academicYear: process.env.NEXT_PUBLIC_LOGIN_ACADEMIC_YEAR?.trim() || '2025-2026',
} as const;

export function resolveLoginSchoolCode(): string {
  return loginSchoolBrand.schoolCode;
}
