import { resolveLoginSchoolCode } from '@/lib/login-school-brand';
import { resolveTenantFromRequest, resolveTenantFromServerHeaders } from '@/lib/tenant';

/** school_code query → host tenant → env fallback (BFF routes). */
export function resolvePublicSchoolCodeFromRequest(request: Request): string {
  const fromQuery = new URL(request.url).searchParams.get('school_code')?.trim();
  if (fromQuery) return fromQuery;
  const resolved = resolveTenantFromRequest(request);
  if (resolved.ok) return resolved.tenant;
  return resolveLoginSchoolCode();
}

/** Host tenant → env fallback (RSC / login page). */
export async function resolvePublicSchoolCodeFromServer(): Promise<string> {
  const resolved = await resolveTenantFromServerHeaders();
  if (resolved.ok) return resolved.tenant;
  return resolveLoginSchoolCode();
}
