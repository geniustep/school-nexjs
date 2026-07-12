// Same-origin defense for cookie-authenticated BFF mutations (POST/PUT/PATCH/DELETE).

import { getHostFromHeaders, normalizeHost } from '@/lib/tenant';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type MutationOriginResult =
  | { ok: true }
  | { ok: false; reason: 'cross_origin' | 'malformed_origin' };

function parseOrigin(raw: string): { protocol: string; host: string } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const host = normalizeHost(url.host);
    if (!host) return null;
    return { protocol: url.protocol, host };
  } catch {
    return null;
  }
}

/**
 * Validate Origin against the trusted Host resolver (Stage 7 Host-first policy).
 * Missing Origin is allowed (SameSite=Lax + tenant session remain defenses).
 */
export function assertMutationOrigin(
  request: Request,
  method: string = request.method,
): MutationOriginResult {
  const httpMethod = method.toUpperCase();
  if (!MUTATION_METHODS.has(httpMethod)) return { ok: true };

  const originHeader = request.headers.get('origin');
  if (!originHeader || !originHeader.trim()) {
    return { ok: true };
  }

  const origin = parseOrigin(originHeader.trim());
  if (!origin) return { ok: false, reason: 'malformed_origin' };

  const trustedHost = getHostFromHeaders(request.headers);
  if (!trustedHost) return { ok: false, reason: 'cross_origin' };

  if (origin.host !== trustedHost) {
    return { ok: false, reason: 'cross_origin' };
  }

  return { ok: true };
}

export function mutationOriginForbiddenBody() {
  return {
    success: false as const,
    error: {
      code: 'forbidden',
      message: 'Request origin is not allowed.',
      details: {},
    },
    meta: {},
  };
}
