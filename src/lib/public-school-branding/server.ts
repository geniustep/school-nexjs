import 'server-only';

import { config } from '@/lib/config';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { endpoints } from '@/lib/api/endpoints';
import { normalizePublicSchoolLogoBytes } from '@/lib/public-school-branding/logo-bytes';
import {
  fallbackLoginSchoolBrandingView,
  fallbackTenantBrandingView,
  mapOdooBrandingToLoginView,
} from '@/lib/public-school-branding/map';
import {
  resolvePublicSchoolCodeFromServer,
  resolvePublicTenantCodeFromServer,
} from '@/lib/public-school-branding/school-code';
import { resolveTenantRuntimeConfigFromServerHeaders } from '@/lib/tenant';
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
  backendBaseUrl?: string,
): Promise<PublicSchoolBrandingFetchResult> {
  const baseUrl = backendBaseUrl ?? (await resolveBrandingBackendBaseUrl());
  if (!baseUrl) return { ok: false, reason: 'http' };

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

export async function fetchPublicSchoolLogoFromOdoo(schoolCode: string, backendBaseUrl?: string) {
  const url = publicSchoolBrandingLogoOdooUrl(schoolCode, backendBaseUrl);

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const raw = new Uint8Array(await res.arrayBuffer());
  return normalizePublicSchoolLogoBytes(raw);
}

export async function resolveLoginSchoolBranding(): Promise<LoginSchoolBrandingView> {
  const runtime = await resolveTenantRuntimeConfigFromServerHeaders();
  const schoolCode = await resolvePublicSchoolCodeFromServer();
  const backendBaseUrl = runtime.ok ? runtime.config.backendBaseUrl : undefined;

  if (!schoolCode) {
    const tenantCode =
      (runtime.ok ? runtime.config.tenantCode : null) ??
      (await resolvePublicTenantCodeFromServer());
    if (tenantCode) return fallbackTenantBrandingView(tenantCode);
    return fallbackLoginSchoolBrandingView('');
  }

  const result = await fetchPublicSchoolBrandingFromOdoo(schoolCode, backendBaseUrl);
  if (!result.ok) {
    return fallbackLoginSchoolBrandingView(schoolCode);
  }

  let branding = mapOdooBrandingToLoginView(result.data);
  if (branding.logoAvailable) {
    const logo = await fetchPublicSchoolLogoFromOdoo(schoolCode, backendBaseUrl);
    if (!logo) {
      branding = { ...branding, logoAvailable: false };
    }
  }
  return branding;
}

async function resolveBrandingBackendBaseUrl(): Promise<string | null> {
  const runtime = await resolveTenantRuntimeConfigFromServerHeaders();
  return runtime.ok ? runtime.config.backendBaseUrl : null;
}

export function publicSchoolBrandingLogoOdooUrl(schoolCode: string, backendBaseUrl?: string): string {
  const baseUrl = backendBaseUrl ?? config.odooBaseUrl;
  return buildOdooApiUrl(baseUrl, config.apiPrefix, endpoints.public.schoolBrandingLogo, {
    school_code: schoolCode,
  });
}

export { brandingCacheSeconds, mapOdooBrandingToLoginView, fallbackLoginSchoolBrandingView, fallbackTenantBrandingView };
