// BFF logout route. Calls the documented logout endpoint (best-effort) then
// clears the local httpOnly session cookie. Idempotent — always returns 200.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { endpoints } from '@/lib/api/endpoints';
import { clearAuthCookies } from '@/lib/auth/tenant-guard';

export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;

  if (sessionId) {
    try {
      await odooApiFetch(endpoints.auth.logout, { method: 'POST', sessionId, body: {} });
    } catch {
      /* ignore — logout is best-effort */
    }
  }

  const response = NextResponse.json(
    { success: true, data: { message: 'Logged out successfully.' }, meta: {} },
    { status: 200 },
  );
  clearAuthCookies(response);
  return response;
}
