import type { SchoolRef } from '@/types/api';

/** Legacy English fallback baked in before RBAC-UX-2A patch — treat as missing. */
const LEGACY_EN_FALLBACK = /^School #\d+$/;

export function hasSchoolDisplayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;
  return !LEGACY_EN_FALLBACK.test(trimmed);
}

/** Localized label for a school ref (never invent a name). */
export function formatSchoolLabel(
  school: Pick<SchoolRef, 'id' | 'name'> | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!school) return t('admin.cmd.defaultSchool');
  if (hasSchoolDisplayName(school.name)) return school.name!.trim();
  return t('admin.schoolFallback', { id: school.id });
}
