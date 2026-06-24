// Public BFF — proxies Odoo GET /api/v1/public/school-branding (no session).

import { NextResponse } from 'next/server';
import {
  brandingCacheSeconds,
  fetchPublicSchoolBrandingFromOdoo,
  mapOdooBrandingToLoginView,
  fallbackLoginSchoolBrandingView,
} from '@/lib/public-school-branding/server';
import { resolvePublicSchoolCodeFromRequest } from '@/lib/public-school-branding/school-code';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const schoolCode = resolvePublicSchoolCodeFromRequest(request);
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
