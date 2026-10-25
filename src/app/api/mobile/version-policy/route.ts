/** Public pre-login update policy; host allowlisted before response. */
import { NextResponse } from 'next/server';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';
import { getAndroidUpdatePolicy } from '@/lib/mobile-update-policy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const tenant = resolveTenantRuntimeConfigFromRequest(request);
  if (!tenant.ok) {
    return NextResponse.json(
      { success: false, error: { code: 'invalid_tenant', message: 'Unsupported host.' } },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    { success: true, data: { android: getAndroidUpdatePolicy() }, meta: {} },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
