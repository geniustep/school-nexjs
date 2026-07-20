import type { ListParams } from '@/types/api';

/**
 * Stable Teacher Domain resource keys.
 * useAdminResource already injects active_school_id; including school/role in the
 * key document ensures scoped cache identity when switching context.
 */
export function teacherDomainQueryKey(parts: {
  resource: string;
  activeSchoolId?: number | null;
  activeRole?: string | null;
  id?: number | string | null;
  filters?: ListParams | Record<string, unknown> | null;
}): string {
  const filterEntries = Object.entries(parts.filters ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({
    domain: 'teacher-domain',
    resource: parts.resource,
    activeSchoolId: parts.activeSchoolId ?? null,
    activeRole: parts.activeRole ?? null,
    id: parts.id ?? null,
    filters: Object.fromEntries(filterEntries),
  });
}

export function teacherDomainScopeChanged(
  previous: { schoolId?: number | null; role?: string | null },
  next: { schoolId?: number | null; role?: string | null },
): boolean {
  return previous.schoolId !== next.schoolId || previous.role !== next.role;
}
