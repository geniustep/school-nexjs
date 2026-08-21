import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import { endpoints } from '@/lib/api/endpoints';
import { activationError, parseActivationPayload } from '@/lib/auth/account-activation';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const ROUTES = {
  verify: endpoints.auth.accountActivationVerify,
  'set-password': endpoints.auth.accountActivationSetPassword,
} as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ stage: string }> },
) {
  const { stage } = await context.params;
  if (stage !== 'verify' && stage !== 'set-password') {
    return json(activationError('not_found', 'Not found.'), 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(activationError('validation_error', 'Invalid request body.'), 422);
  }
  const parsed = parseActivationPayload(stage, raw);
  if (!parsed.ok) {
    return json(activationError('validation_error', 'Invalid activation data.'), 422);
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    return json(activationError('invalid_tenant', 'Invalid or unsupported host.'), 400);
  }

  try {
    const response = await fetch(
      buildOdooApiUrl(runtime.config.backendBaseUrl, config.apiPrefix, ROUTES[stage]),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(parsed.body),
        cache: 'no-store',
      },
    );
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = activationError('upstream_error', 'Unexpected server response.');
    }
    return json(body, response.status);
  } catch {
    return json(activationError('network_error', 'Could not reach the server.'), 502);
  }
}
