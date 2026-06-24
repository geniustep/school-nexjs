import 'server-only';

import { config } from '@/lib/config';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { resolveOdooBaseUrlForTenant } from '@/lib/api/odoo-backend';
import { endpoints } from '@/lib/api/endpoints';
import { resolveLoginSchoolCode } from '@/lib/login-school-brand';
import {
  fallbackLoginSchoolBrandingView,
  mapOdooBrandingToLoginView,
} from '@/lib/public-school-branding/map';
import type {
  LoginSchoolBrandingView,
  PublicSchoolBrandingData,
  PublicSchoolBrandingMeta,
} from '@/types/public-school-branding';
import type { ApiResponse } from '@/types/api';

export type PublicSchoolBrandingFetchResult =
  | { ok: true; data: PublicSchoolBrandingData; meta: PublicSchoolBrandingMeta }
  | { ok: false; reason: 'network' | 'http' | 'invalid_body' };

function brandingCacheSeconds(meta?: PublicSchoolBrandingMeta): number {
  const ttl = meta?.cache_ttl_seconds;
  return typeof ttl === 'number' && ttl > 0 ? ttl : 300;
}

export async function fetchPublicSchoolBrandingFromOdoo(
  schoolCode: string,
): Promise<PublicSchoolBrandingFetchResult> {
  const baseUrl = resolveOdooBaseUrlForTenant(schoolCode);
  const url = buildOdooApiUrl(baseUrl, config.apiPrefix, endpoints.public.schoolBranding, {
    school_code: schoolCode,
  });

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch {
    return { ok: false, reason: 'network' };
  }

  let body: ApiResponse<PublicSchoolBrandingData>;
  try {
    body = (await res.json()) as ApiResponse<PublicSchoolBrandingData>;
  } catch {
    return { ok: false, reason: 'invalid_body' };
  }

  if (!res.ok || !body.success || !body.data) {
    return { ok: false, reason: 'http' };
  }

  return { ok: true, data: body.data, meta: body.meta ?? {} };
}

export async function resolveLoginSchoolBranding(
  schoolCode: string = resolveLoginSchoolCode(),
): Promise<LoginSchoolBrandingView> {
  const result = await fetchPublicSchoolBrandingFromOdoo(schoolCode);
  if (!result.ok) {
    return fallbackLoginSchoolBrandingView(schoolCode);
  }
  return mapOdooBrandingToLoginView(result.data);
}

export function publicSchoolBrandingLogoOdooUrl(schoolCode: string): string {
  const baseUrl = resolveOdooBaseUrlForTenant(schoolCode);
  return buildOdooApiUrl(baseUrl, config.apiPrefix, endpoints.public.schoolBrandingLogo, {
    school_code: schoolCode,
  });
}

export { brandingCacheSeconds, mapOdooBrandingToLoginView, fallbackLoginSchoolBrandingView };
