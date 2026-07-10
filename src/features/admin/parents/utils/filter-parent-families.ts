import type { ParentFamilyGroup } from '@/features/admin/parents/utils/group-parents-by-family';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Parent } from '@/types/parent';

export interface ParentFamilyFilters {
  status?: string;
  accountFilter?: string;
  childrenFilter?: '' | 'has' | 'none';
  /** Default-on: hide guardian-only rows until the user searches. */
  hideWithoutChildren?: boolean;
  relationshipType?: string;
  language?: string;
}

function parentHasAccount(parent: Parent): boolean {
  return (
    parent.account?.has_user_account === true ||
    parent.has_user_account === true ||
    parent.has_account === true ||
    typeof parent.user_id === 'number'
  );
}

function familyMatchesSearch(family: ParentFamilyGroup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const childHaystack = family.children.map((c) => getStudentDisplayName(c)).join(' ').toLowerCase();
  const guardianHaystack = family.guardians
    .map(({ parent }) =>
      [parent.name, parent.phone, parent.mobile, parent.email, parent.preferred_language]
        .filter(Boolean)
        .join(' '),
    )
    .join(' ')
    .toLowerCase();

  return `${childHaystack} ${guardianHaystack}`.includes(q);
}

function familyMatchesStatus(family: ParentFamilyGroup, status: string): boolean {
  if (!status) return true;
  return family.guardians.some(({ parent }) => parent.status === status);
}

function familyMatchesAccount(family: ParentFamilyGroup, accountFilter: string): boolean {
  if (!accountFilter) return true;

  if (accountFilter === 'has_account') {
    return family.guardians.some(({ parent }) => parentHasAccount(parent));
  }
  if (accountFilter === 'no_account') {
    return family.guardians.every(({ parent }) => !parentHasAccount(parent));
  }
  return true;
}

function familyMatchesChildren(family: ParentFamilyGroup, childrenFilter: ParentFamilyFilters['childrenFilter']): boolean {
  if (!childrenFilter) return true;
  if (childrenFilter === 'has') return family.children.length > 0;
  if (childrenFilter === 'none') return family.children.length === 0;
  return true;
}

function familyMatchesRelationship(family: ParentFamilyGroup, relationshipType: string): boolean {
  if (!relationshipType) return true;
  return family.guardians.some(({ relationshipType: type }) => type === relationshipType);
}

function familyMatchesLanguage(family: ParentFamilyGroup, language: string): boolean {
  if (!language) return true;
  return family.guardians.some(
    ({ parent }) => (parent.preferred_language ?? '').toLowerCase() === language.toLowerCase(),
  );
}

function familyMatchesHideWithoutChildren(
  family: ParentFamilyGroup,
  hideWithoutChildren: boolean | undefined,
  search: string,
  childrenFilter: ParentFamilyFilters['childrenFilter'],
): boolean {
  if (childrenFilter === 'none') return true;
  if (hideWithoutChildren === false) return true;
  if (search.trim()) return true;
  return family.children.length > 0;
}

export type FilterParentFamiliesOptions = {
  /**
   * When true and `search` is non-empty, skip local name/phone/email matching.
   * Parents list always sends `search` to the Backend — local re-filtering would
   * drop identity-document matches (masked list rows cannot match the raw query).
   */
  serverSearchAuthoritative?: boolean;
};

export function filterParentFamilies(
  families: ParentFamilyGroup[],
  filters: ParentFamilyFilters,
  search = '',
  options?: FilterParentFamiliesOptions,
): ParentFamilyGroup[] {
  const hideWithoutChildren = filters.hideWithoutChildren !== false;
  const skipLocalSearchMatch =
    Boolean(options?.serverSearchAuthoritative) && Boolean(search.trim());

  return families.filter(
    (family) =>
      (skipLocalSearchMatch || familyMatchesSearch(family, search)) &&
      familyMatchesStatus(family, filters.status ?? '') &&
      familyMatchesAccount(family, filters.accountFilter ?? '') &&
      familyMatchesChildren(family, filters.childrenFilter) &&
      familyMatchesHideWithoutChildren(family, hideWithoutChildren, search, filters.childrenFilter) &&
      familyMatchesRelationship(family, filters.relationshipType ?? '') &&
      familyMatchesLanguage(family, filters.language ?? ''),
  );
}

export function hasActiveParentFamilyFilters(filters: ParentFamilyFilters, search = ''): boolean {
  return !!(
    search.trim() ||
    filters.status ||
    filters.accountFilter ||
    filters.childrenFilter ||
    filters.hideWithoutChildren === false ||
    filters.relationshipType ||
    filters.language
  );
}

/** Families with no linked children hidden by the default-on toggle (no search override). */
export function countHiddenGuardianOnlyFamilies(
  families: ParentFamilyGroup[],
  filters: ParentFamilyFilters,
  search = '',
): number {
  if (filters.hideWithoutChildren === false) return 0;
  if (search.trim()) return 0;
  if (filters.childrenFilter === 'none') return 0;
  return families.filter((family) => family.children.length === 0).length;
}
