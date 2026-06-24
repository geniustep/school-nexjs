// Public BFF — proxies Odoo GET /api/v1/public/school-branding/logo (no session).

import { NextResponse } from 'next/server';
import {
  brandingCacheSeconds,
  publicSchoolBrandingLogoOdooUrl,
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
  const odooUrl = publicSchoolBrandingLogoOdooUrl(schoolCode);

  let res: Response;
  try {
    res = await fetch(odooUrl, { cache: 'no-store' });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'network_error', message: 'Could not reach branding service.', details: {} }, meta: {} },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return new Response(null, { status: res.status === 404 ? 404 : 502 });
  }

  const data = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') ?? 'image/png';
  const ttl = brandingCacheSeconds();

  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${ttl}`,
    },
  });
}
