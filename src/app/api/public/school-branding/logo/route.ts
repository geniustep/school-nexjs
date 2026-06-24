// Public BFF — proxies Odoo GET /api/v1/public/school-branding/logo (no session).

import {
  brandingCacheSeconds,
  fetchPublicSchoolLogoFromOdoo,
} from '@/lib/public-school-branding/server';
import { resolvePublicSchoolCodeFromRequest } from '@/lib/public-school-branding/school-code';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const schoolCode = resolvePublicSchoolCodeFromRequest(request);
  const logo = await fetchPublicSchoolLogoFromOdoo(schoolCode);

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
