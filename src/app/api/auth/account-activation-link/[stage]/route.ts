import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { endpoints } from '@/lib/api/endpoints';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import {
  accountActivationLinkError,
  parseAccountActivationLinkPayload,
  type AccountActivationLinkStage,
} from '@/lib/auth/account-activation-link';
import { resolveTenantRuntimeConfigFromRequest } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const ROUTES = {
  inspect: endpoints.public.accountActivationLinkInspect,
  complete: endpoints.public.accountActivationLinkComplete,
} as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ stage: string }> }) {
  const { stage } = await context.params;
  if (stage !== 'inspect' && stage !== 'complete') {
    return json(accountActivationLinkError('not_found'), 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(accountActivationLinkError('validation_error'), 422);
  }

  const parsed = parseAccountActivationLinkPayload(stage as AccountActivationLinkStage, raw);
  if (!parsed.ok) {
    const code = parsed.reason === 'password' ? 'password_required'
      : parsed.reason === 'shape' ? 'validation_error' : 'activation_failed';
    return json(accountActivationLinkError(code), parsed.reason === 'token' ? 400 : 422);
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') return tenantBackendNotConfiguredResponse();
    return json(accountActivationLinkError('activation_failed'), 400);
  }
  if (parsed.body.token.split('.', 1)[0] !== runtime.config.tenantCode) {
    return json(accountActivationLinkError('activation_failed'), 400);
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
      body = accountActivationLinkError('activation_failed');
    }
    return json(body, response.status);
  } catch {
    return json(accountActivationLinkError('network_error'), 502);
  }
}
