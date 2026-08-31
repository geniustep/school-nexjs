import type { ApiResponse } from '@/types/api';

export const RESTORE_CREDENTIAL_PATHS = {
  registrationOptions: '/auth/restore-credentials/registration/options',
  registrationVerify: '/auth/restore-credentials/registration/verify',
  authenticationOptions: '/auth/restore-credentials/authentication/options',
  authenticationVerify: '/auth/restore-credentials/authentication/verify',
  revoke: '/auth/restore-credentials/revoke',
} as const;

export type RestoreCredentialPath =
  (typeof RESTORE_CREDENTIAL_PATHS)[keyof typeof RESTORE_CREDENTIAL_PATHS];

export type RestoreCredentialRoute =
  | 'registration/options'
  | 'registration/verify'
  | 'authentication/options'
  | 'authentication/verify'
  | 'revoke';

export type RestoreCredentialBody = Record<string, unknown>;

const ROUTE_TO_ODOO_PATH: Record<RestoreCredentialRoute, RestoreCredentialPath> = {
  'registration/options': RESTORE_CREDENTIAL_PATHS.registrationOptions,
  'registration/verify': RESTORE_CREDENTIAL_PATHS.registrationVerify,
  'authentication/options': RESTORE_CREDENTIAL_PATHS.authenticationOptions,
  'authentication/verify': RESTORE_CREDENTIAL_PATHS.authenticationVerify,
  revoke: RESTORE_CREDENTIAL_PATHS.revoke,
};

const AUTHENTICATED_ROUTES = new Set<RestoreCredentialRoute>([
  'registration/options',
  'registration/verify',
  'revoke',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(body).every((key) => allowedSet.has(key));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolveRestoreCredentialRoute(
  segments: readonly string[],
): RestoreCredentialRoute | null {
  const route = segments.join('/') as RestoreCredentialRoute;
  return Object.prototype.hasOwnProperty.call(ROUTE_TO_ODOO_PATH, route) ? route : null;
}

export function restoreCredentialOdooPath(route: RestoreCredentialRoute): RestoreCredentialPath {
  return ROUTE_TO_ODOO_PATH[route];
}

export function restoreCredentialRouteRequiresSession(route: RestoreCredentialRoute): boolean {
  return AUTHENTICATED_ROUTES.has(route);
}

export type RestoreCredentialParseResult =
  | { ok: true; body: RestoreCredentialBody }
  | { ok: false };

export function parseRestoreCredentialBody(
  route: RestoreCredentialRoute,
  raw: unknown,
): RestoreCredentialParseResult {
  if (!isRecord(raw)) return { ok: false };

  if (route === 'registration/options' || route === 'authentication/options') {
    return Object.keys(raw).length === 0 ? { ok: true, body: {} } : { ok: false };
  }

  if (route === 'registration/verify' || route === 'authentication/verify') {
    if (!hasOnlyKeys(raw, ['challenge_id', 'credential'])) return { ok: false };
    if (!nonEmptyString(raw.challenge_id) || !isRecord(raw.credential)) return { ok: false };
    return {
      ok: true,
      body: {
        challenge_id: raw.challenge_id.trim(),
        credential: raw.credential,
      },
    };
  }

  if (!hasOnlyKeys(raw, ['credential_id', 'revoke_all'])) return { ok: false };
  if (raw.credential_id !== undefined && !nonEmptyString(raw.credential_id)) return { ok: false };
  if (raw.revoke_all !== undefined && typeof raw.revoke_all !== 'boolean') return { ok: false };
  if (raw.credential_id === undefined && raw.revoke_all === undefined) return { ok: false };

  const body: RestoreCredentialBody = {};
  if (raw.credential_id !== undefined) body.credential_id = raw.credential_id.trim();
  if (raw.revoke_all !== undefined) body.revoke_all = raw.revoke_all;
  return { ok: true, body };
}

export function extractOdooSessionId(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/(?:^|[,;]\s*)session_id=([^;,"]+)/);
  return match?.[1]?.trim() || null;
}

export function restoreCredentialError(
  code: string,
  message: string,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details: {} },
    meta: {},
  };
}
