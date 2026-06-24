// Public BFF — proxies Odoo GET /api/v1/public/school-branding (no session).

import { NextResponse } from 'next/server';
import {
  brandingCacheSeconds,
  fetchPublicSchoolBrandingFromOdoo,
  mapOdooBrandingToLoginView,
  fallbackLoginSchoolBrandingView,
} from '@/lib/public-school-branding/server';
import { resolveLoginSchoolCode } from '@/lib/login-school-brand';
import { resolveTenantFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function schoolCodeFromRequest(request: Request): string {
  const fromQuery = new URL(request.url).searchParams.get('school_code')?.trim();
  if (fromQuery) return fromQuery;
  const resolved = resolveTenantFromRequest(request);
  if (resolved.ok) return resolved.tenant;
  return resolveLoginSchoolCode();
}

export async function GET(request: Request) {
  const schoolCode = schoolCodeFromRequest(request);
  const result = await fetchPublicSchoolBrandingFromOdoo(schoolCode);

  if (!result.ok) {
    const view = fallbackLoginSchoolBrandingView(schoolCode);
    return NextResponse.json(
      {
        success: true,
        data: {
          branding: view,
          source: 'fallback',
          reason: result.reason,
        },
        meta: {},
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }

  const branding = mapOdooBrandingToLoginView(result.data);
  const ttl = brandingCacheSeconds(result.meta);

  return NextResponse.json(
    {
      success: true,
      data: {
        branding,
        source: result.data.fallback_brand ? 'fallback' : 'api',
        raw: {
          school_code: result.data.school_code,
          fallback_brand: result.data.fallback_brand,
          logo_available: branding.logoAvailable,
        },
      },
      meta: result.meta,
    },
    {
      status: 200,
      headers: { 'Cache-Control': `public, max-age=${ttl}` },
    },
  );
}
