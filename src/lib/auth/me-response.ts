// Shared GET /me response for BFF auth routes (login echo + /api/auth/me).

import 'server-only';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';

const UNAUTH_BODY = {
  success: false as const,
  error: { code: 'unauthenticated', message: 'No active session.', details: {} },
  meta: {},
};

/** Returns the current session user in the standard API v1 envelope. */
export async function jsonMeFromSession(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(UNAUTH_BODY, { status: 401 });
  }

  return NextResponse.json(
    {
      success: true,
      data: { user },
      meta: {},
    },
    { status: 200 },
  );
}
