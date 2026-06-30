import 'server-only';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPut } from '@/lib/api/server';
import { fetchPublicSchoolBrandingFromOdoo } from '@/lib/public-school-branding/server';
import { resolvePublicSchoolCodeFromServer } from '@/lib/public-school-branding/school-code';
import type { AdminSchoolBrandingOdooData, AdminSchoolBrandingPutPayload, AdminSchoolBrandingSettingsSource } from '@/types/admin-school-branding';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { PublicSchoolBrandingData } from '@/types/public-school-branding';

export type AdminSchoolBrandingSettingsBundle = {
  data: AdminSchoolBrandingOdooData;
  meta: Record<string, unknown>;
  source: AdminSchoolBrandingSettingsSource;
};

function unwrapBrandingData(
  data: AdminSchoolBrandingOdooData | { branding: AdminSchoolBrandingOdooData },
): AdminSchoolBrandingOdooData {
  if (data && typeof data === 'object' && 'branding' in data && data.branding) {
    return data.branding;
  }
  return data as AdminSchoolBrandingOdooData;
}

function publicToAdminShape(data: PublicSchoolBrandingData): AdminSchoolBrandingOdooData {
  return {
    school_code: data.school_code,
    school_name: data.school_name,
    welcome_subtitle: data.welcome_subtitle,
    academic_year_label: data.academic_year_label,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    accent_color: data.accent_color,
    logo_available: data.logo_available,
    logo_url: data.logo_url,
    fallback_brand: data.fallback_brand,
  };
}

function isAdminBrandingUnavailable(res: ApiResponse<unknown>): boolean {
  if (res.success) return false;
  const code = res.error.code;
  return code === 'not_found' || code === 'server_error' || code === 'network_error';
}

async function fetchPublicAdminFallback(): Promise<
  | { ok: true; bundle: AdminSchoolBrandingSettingsBundle }
  | { ok: false; error: ApiErrorBody }
> {
  const schoolCode = await resolvePublicSchoolCodeFromServer();
  if (!schoolCode) {
    return {
      ok: false,
      error: {
        code: 'load_failed',
        message: 'Could not load school branding.',
        details: { reason: 'no_school_context' },
      },
    };
  }
  const publicResult = await fetchPublicSchoolBrandingFromOdoo(schoolCode);
  if (!publicResult.ok) {
    return {
      ok: false,
      error: {
        code: publicResult.reason === 'network' ? 'network_error' : 'load_failed',
        message: 'Could not load school branding.',
        details: { reason: publicResult.reason },
      },
    };
  }
  return {
    ok: true,
    bundle: {
      data: publicToAdminShape(publicResult.data),
      meta: publicResult.meta,
      source: 'public_fallback',
    },
  };
}

export async function fetchAdminSchoolBrandingSettings(): Promise<
  | { ok: true; bundle: AdminSchoolBrandingSettingsBundle }
  | { ok: false; error: ApiErrorBody }
> {
  const res = await serverGet<AdminSchoolBrandingOdooData | { branding: AdminSchoolBrandingOdooData }>(
    endpoints.admin.schoolBranding,
  );

  if (res.success && res.data) {
    return {
      ok: true,
      bundle: {
        data: unwrapBrandingData(res.data),
        meta: (res.meta as Record<string, unknown>) ?? {},
        source: 'admin',
      },
    };
  }

  if (isAdminBrandingUnavailable(res)) {
    return fetchPublicAdminFallback();
  }

  if (!res.success) {
    return { ok: false, error: res.error };
  }

  return fetchPublicAdminFallback();
}

/** @deprecated use fetchAdminSchoolBrandingSettings */
export async function fetchAdminSchoolBrandingFromOdoo(): Promise<
  ApiResponse<AdminSchoolBrandingOdooData>
> {
  const result = await fetchAdminSchoolBrandingSettings();
  if (!result.ok) return { success: false, error: result.error, meta: {} };
  return { success: true, data: result.bundle.data, meta: result.bundle.meta };
}

export async function updateAdminSchoolBrandingInOdoo(
  payload: AdminSchoolBrandingPutPayload,
): Promise<ApiResponse<AdminSchoolBrandingOdooData>> {
  const res = await serverPut<
    AdminSchoolBrandingOdooData | { branding: AdminSchoolBrandingOdooData }
  >(endpoints.admin.schoolBranding, payload);
  if (!res.success || !res.data) return res as ApiResponse<AdminSchoolBrandingOdooData>;
  return { ...res, data: unwrapBrandingData(res.data) };
}
