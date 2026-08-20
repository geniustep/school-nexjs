// Admin BFF — proxies Odoo GET/PUT /api/v1/admin/school-branding (session + active_school_id).

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';
import {
  extractAdminBrandingColors,
  mapAdminSchoolBrandingToView,
} from '@/lib/admin-school-branding/map';
import { buildOdooSchoolBrandingPutPayload, type SchoolBrandingClientPutBody } from '@/lib/admin-school-branding/put-payload';
import {
  fetchAdminSchoolBrandingSettings,
  updateAdminSchoolBrandingInOdoo,
} from '@/lib/admin-school-branding/server';
import {
  canManageSchoolBrandingSettings,
  canViewSchoolBrandingSettings,
  resolveSchoolBrandingSaveAvailable,
} from '@/lib/permissions/school-branding-settings';

export const dynamic = 'force-dynamic';

function jsonError(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  return NextResponse.json(
    { success: false, error: { code, message, details }, meta: {} },
    { status },
  );
}

function forbidden() {
  return jsonError('forbidden', 'Forbidden', 403);
}

function mapSettingsResponse(
  data: Parameters<typeof mapAdminSchoolBrandingToView>[0],
  source: string,
  saveAvailable: boolean,
) {
  const branding = mapAdminSchoolBrandingToView(data);
  const colors = extractAdminBrandingColors(data);
  return {
    branding,
    schoolNameAr: data.school_name_ar ?? data.school_name ?? null,
    schoolNameLat: data.school_name_lat ?? null,
    schoolShortName: data.school_short_name ?? null,
    street: data.street ?? null,
    city: data.city ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    website: data.website ?? null,
    welcomeSubtitle: data.welcome_subtitle ?? null,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    source,
    saveAvailable,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canViewSchoolBrandingSettings(user)) {
    return forbidden();
  }
  if (!user.active_school_id) {
    return jsonError('no_active_school', 'No active school selected.', 400);
  }

  const result = await fetchAdminSchoolBrandingSettings();
  if (!result.ok) {
    const status =
      result.error.code === 'forbidden' || result.error.code === 'permission_denied'
        ? 403
        : 502;
    return jsonError(
      result.error.code ?? 'load_failed',
      result.error.message ?? 'Could not load school branding.',
      status,
    );
  }

  const { bundle } = result;
  return NextResponse.json(
    {
      success: true,
      data: mapSettingsResponse(
        bundle.data,
        bundle.source,
        resolveSchoolBrandingSaveAvailable(user, bundle.source),
      ),
      meta: bundle.meta,
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSchoolBrandingSettings(user)) {
    return forbidden();
  }
  if (!user.active_school_id) {
    return jsonError('no_active_school', 'No active school selected.', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('validation_error', 'Invalid request body.', 422);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('validation_error', 'Invalid request body.', 422);
  }

  const built = buildOdooSchoolBrandingPutPayload(body as SchoolBrandingClientPutBody);
  if (!built.ok) {
    return jsonError('validation_error', 'Validation failed.', 422, {
      field: built.field ?? null,
    });
  }

  const loadProbe = await fetchAdminSchoolBrandingSettings();
  if (!loadProbe.ok) {
    const status =
      loadProbe.error.code === 'forbidden' || loadProbe.error.code === 'permission_denied'
        ? 403
        : 502;
    return jsonError(
      loadProbe.error.code ?? 'load_failed',
      loadProbe.error.message ?? 'Could not load school branding.',
      status,
    );
  }
  if (loadProbe.bundle.source !== 'admin') {
    return jsonError(
      'save_contract_unavailable',
      'Admin save contract is not available on this school server.',
      503,
      { source: loadProbe.bundle.source },
    );
  }

  const result = await updateAdminSchoolBrandingInOdoo(built.payload);
  if (!result.success) {
    const code = result.error.code ?? 'server_error';
    const status =
      code === 'forbidden' || code === 'permission_denied'
        ? 403
        : code === 'validation_error'
          ? 422
          : code === 'not_found' || code === 'save_contract_unavailable'
            ? 503
            : 502;
    return jsonError(
      code,
      result.error.message ?? 'Could not save school branding.',
      status,
      typeof result.error.details === 'object' && result.error.details
        ? (result.error.details as Record<string, unknown>)
        : {},
    );
  }
  if (!result.data) {
    return jsonError('server_error', 'Could not save school branding.', 500);
  }

  return NextResponse.json(
    {
      success: true,
      data: mapSettingsResponse(
        result.data,
        'admin',
        resolveSchoolBrandingSaveAvailable(user, 'admin'),
      ),
      meta: result.meta ?? {},
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
