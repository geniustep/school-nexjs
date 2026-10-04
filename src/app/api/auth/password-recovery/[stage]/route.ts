import { NextResponse } from 'next/server';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { tenantBackendNotConfiguredResponse } from '@/lib/api/odoo-backend';
import {
  assertMutationOrigin,
  mutationOriginForbiddenBody,
} from '@/lib/api/mutation-origin';
import { config } from '@/lib/config';
import { endpoints } from '@/lib/api/endpoints';
import {
  parsePasswordRecoveryPayload,
  passwordRecoveryError,
  type PasswordRecoveryStage,
} from '@/lib/auth/password-recovery';
import {
  resolveTenantFromRequest,
  resolveTenantRuntimeConfigFromRequest,
} from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const ROUTES: Record<PasswordRecoveryStage, string> = {
  request: endpoints.auth.passwordRecoveryRequest,
  verify: endpoints.auth.passwordRecoveryVerify,
  complete: endpoints.auth.passwordRecoveryComplete,
};

function json(body: unknown, status: number, retryAfter?: string | null) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
  };
  if (retryAfter) headers['Retry-After'] = retryAfter;
  return NextResponse.json(body, { status, headers });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ stage: string }> },
) {
  const { stage: rawStage } = await context.params;
  if (!['request', 'verify', 'complete'].includes(rawStage)) {
    return json(passwordRecoveryError('not_found', 'Not found.'), 404);
  }
  const stage = rawStage as PasswordRecoveryStage;

  const originCheck = assertMutationOrigin(request, 'POST');
  if (!originCheck.ok) {
    return json(mutationOriginForbiddenBody(), 403);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(passwordRecoveryError('validation_error', 'Invalid request body.'), 422);
  }

  const parsed = parsePasswordRecoveryPayload(stage, raw);
  if (!parsed.ok) {
    return json(passwordRecoveryError('validation_error', 'Invalid password recovery data.'), 422);
  }

  const tenantResolved = resolveTenantFromRequest(request);
  if (!tenantResolved.ok) {
    return json(passwordRecoveryError('invalid_tenant', 'Invalid or unsupported host.'), 400);
  }

  const runtime = resolveTenantRuntimeConfigFromRequest(request);
  if (!runtime.ok) {
    if (runtime.reason === 'tenant_backend_not_configured') {
      return tenantBackendNotConfiguredResponse();
    }
    return json(passwordRecoveryError('invalid_tenant', 'Invalid or unsupported host.'), 400);
  }

  try {
    const response = await fetch(
      buildOdooApiUrl(
        runtime.config.backendBaseUrl,
        config.apiPrefix,
        ROUTES[stage],
        { db: tenantResolved.tenant },
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsed.body),
        cache: 'no-store',
      },
    );

    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = passwordRecoveryError('upstream_error', 'Unexpected server response.');
    }

    return json(body, response.status, response.headers.get('retry-after'));
  } catch {
    return json(
      passwordRecoveryError('network_error', 'Could not reach the server.'),
      502,
    );
  }
}
