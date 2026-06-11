// BFF session probe for mobile clients — same envelope as login's `/me` payload.

import { guardTenantFromRequest } from '@/lib/auth/tenant-guard';
import { jsonMeFromSession } from '@/lib/auth/me-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tenantGuard = await guardTenantFromRequest(request);
  if (!tenantGuard.ok) return tenantGuard.response;

  return jsonMeFromSession();
}
