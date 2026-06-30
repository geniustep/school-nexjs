import { resolveLoginSchoolCode } from '@/lib/login-school-brand';
import {
  isFallbackHost,
  resolveTenantRuntimeConfigFromRequest,
  resolveTenantRuntimeConfigFromServerHeaders,
} from '@/lib/tenant';

/**
 * Resolve school_code for public branding BFF routes.
 * Query param → optional registry default → env fallback on dev hosts only.
 * Returns null when no school context is configured (multi-school tenant).
 */
export function resolvePublicSchoolCodeFromRequest(request: Request): string | null {
  const fromQuery = new URL(request.url).searchParams.get('school_code')?.trim();
  if (fromQuery) return fromQuery;

  const resolved = resolveTenantRuntimeConfigFromRequest(request);
  if (resolved.ok) {
    if (resolved.config.defaultPublicSchoolCode) {
      return resolved.config.defaultPublicSchoolCode;
    }
    if (isFallbackHost(resolved.config.host)) {
      return resolveLoginSchoolCode();
    }
    return null;
  }

  if (resolved.reason === 'missing_fallback_db') return null;
  return resolveLoginSchoolCode();
}

/** Registry default → env fallback on dev hosts (RSC / login page). */
export async function resolvePublicSchoolCodeFromServer(): Promise<string | null> {
  const resolved = await resolveTenantRuntimeConfigFromServerHeaders();
  if (resolved.ok) {
    if (resolved.config.defaultPublicSchoolCode) {
      return resolved.config.defaultPublicSchoolCode;
    }
    if (isFallbackHost(resolved.config.host)) {
      return resolveLoginSchoolCode();
    }
    return null;
  }

  if (resolved.reason === 'missing_fallback_db') return null;
  return resolveLoginSchoolCode();
}

/** Tenant code from host (distinct from school context for Odoo public APIs). */
export function resolvePublicTenantCodeFromRequest(request: Request): string | null {
  const resolved = resolveTenantRuntimeConfigFromRequest(request);
  return resolved.ok ? resolved.config.tenantCode : null;
}

/** Tenant code from server headers (RSC). */
export async function resolvePublicTenantCodeFromServer(): Promise<string | null> {
  const resolved = await resolveTenantRuntimeConfigFromServerHeaders();
  return resolved.ok ? resolved.config.tenantCode : null;
}
