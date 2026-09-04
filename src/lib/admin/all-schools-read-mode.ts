export const ALL_SCHOOLS_SCOPE_VALUE = 'all-schools';

const ALL_SCHOOLS_ELIGIBLE_PATHS = new Set([
  '/admin/dashboard',
  '/admin/students',
  '/admin/classes',
  '/admin/parents',
]);

export function isAllSchoolsEligiblePath(pathname: string | null | undefined): boolean {
  return !!pathname && ALL_SCHOOLS_ELIGIBLE_PATHS.has(pathname);
}

export function isAllSchoolsReadMode(
  pathname: string | null | undefined,
  searchParams: Pick<URLSearchParams, 'get'>,
): boolean {
  return (
    isAllSchoolsEligiblePath(pathname) &&
    searchParams.get('scope') === ALL_SCHOOLS_SCOPE_VALUE
  );
}

export function setAllSchoolsScope(
  searchParams: Pick<URLSearchParams, 'toString'>,
  enabled: boolean,
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  if (enabled) next.set('scope', ALL_SCHOOLS_SCOPE_VALUE);
  else next.delete('scope');
  return next;
}
