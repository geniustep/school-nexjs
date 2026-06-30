// Public BFF — proxies Odoo GET /api/v1/public/school-branding/logo (no session).

import {
  brandingCacheSeconds,
  fetchPublicSchoolLogoFromOdoo,
} from '@/lib/public-school-branding/server';
import { resolvePublicSchoolCodeFromRequest } from '@/lib/public-school-branding/school-code';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const schoolCode = resolvePublicSchoolCodeFromRequest(request);
  if (!schoolCode) {
    return new Response(null, { status: 404 });
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  const backendBaseUrl = runtime.ok ? runtime.config.backendBaseUrl : undefined;
  const logo = await fetchPublicSchoolLogoFromOdoo(schoolCode, backendBaseUrl);

  if (!logo) {
    return new Response(null, { status: 404 });
  }

  const ttl = brandingCacheSeconds();

  return new Response(logo.bytes, {
    status: 200,
    headers: {
      'Content-Type': logo.contentType,
      'Cache-Control': `public, max-age=${ttl}`,
    },
  });
}
