// Shared GET /me response for BFF auth routes (login echo + /api/auth/me).

import 'server-only';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api/server';
import type { LegalActiveRole } from '@/lib/auth/active-role-transport';

const UNAUTH_BODY = {
  success: false as const,
  error: { code: 'unauthenticated', message: 'No active session.', details: {} },
  meta: {},
};

export type JsonMeFromSessionOptions = {
  /** Explicit active-role context from the inbound request (never inferred). */
  activeRole?: LegalActiveRole;
};

/** Returns the current session user in the standard API v1 envelope. */
export async function jsonMeFromSession(
  options?: JsonMeFromSessionOptions,
): Promise<NextResponse> {
  const user = await getCurrentUser(options?.activeRole);
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
