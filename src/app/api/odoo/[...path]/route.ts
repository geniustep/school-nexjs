// Generic BFF proxy. Every browser-side data call goes through here:
//
//   GET /api/odoo/admin/students  ->  GET {ODOO}/api/v1/admin/students
//
// The route injects the httpOnly Odoo session cookie, forwards query + body,
// and returns Odoo's response envelope untouched. This keeps the session
// server-side and gives the client a single same-origin base URL.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { odooApiFetch } from '@/lib/api/odoo-server';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest, segments: string[]) {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'unauthenticated', message: 'No active session.', details: {} },
        meta: {},
      },
      { status: 401 },
    );
  }

  const path = '/' + segments.map(encodeURIComponent).join('/');
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown;
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  const { status, body: responseBody } = await odooApiFetch(path, {
    method,
    sessionId,
    query,
    body,
  });

  return NextResponse.json(responseBody, { status });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(request, path);
}
