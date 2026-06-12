import type { StaffMember } from '@/types/academic-setup';

export type StaffStatusFilter = 'active' | 'inactive' | 'all';

export type StaffAction =
  | 'deactivated'
  | 'already_inactive'
  | 'reactivated'
  | 'already_active';

const VALID_STATUS_FILTERS = new Set<StaffStatusFilter>(['active', 'inactive', 'all']);

export function parseStaffStatusFilter(raw: string | null | undefined): StaffStatusFilter {
  if (raw && VALID_STATUS_FILTERS.has(raw as StaffStatusFilter)) {
    return raw as StaffStatusFilter;
  }
  return 'active';
}

export function buildStaffListQuery(input: {
  status: StaffStatusFilter;
  search?: string;
  limit?: number;
}): Record<string, string | number | undefined> {
  const query: Record<string, string | number | undefined> = {
    status: input.status,
    limit: input.limit ?? 100,
  };
  const search = input.search?.trim();
  if (search) query.search = search;
  return query;
}

/** Normalize staff list/detail rows from API v1.0.73+ with safe legacy fallbacks. */
export function normalizeStaffMember(raw: StaffMember): StaffMember {
  const active = raw.active ?? raw.account_status === 'active';
  return {
    ...raw,
    active,
    can_deactivate: raw.can_deactivate ?? active,
    can_reactivate: raw.can_reactivate ?? !active,
    login: raw.login ?? raw.account?.login ?? null,
  };
}

export function isStaffInactive(member: StaffMember): boolean {
  const normalized = normalizeStaffMember(member);
  return !normalized.active || normalized.account_status === 'inactive';
}

export function staffEmptyStateKey(
  status: StaffStatusFilter,
  hasSearch: boolean,
): string {
  if (hasSearch) return 'admin.academicSetup.noStaffSearchResults';
  if (status === 'inactive') return 'admin.academicSetup.noInactiveStaff';
  if (status === 'active') return 'admin.academicSetup.noActiveStaff';
  return 'admin.academicSetup.noStaff';
}

export function staffMutationSuccessKey(action?: StaffAction): string | null {
  switch (action) {
    case 'reactivated':
      return 'admin.academicSetup.staffReactivated';
    case 'already_active':
      return 'admin.academicSetup.staffAlreadyActive';
    case 'deactivated':
      return 'admin.academicSetup.staffDeactivated';
    case 'already_inactive':
      return 'admin.academicSetup.staffAlreadyInactive';
    default:
      return null;
  }
}

export function resolveStaffLogin(member: StaffMember): string {
  const normalized = normalizeStaffMember(member);
  return normalized.login?.trim() || normalized.email?.trim() || '';
}
