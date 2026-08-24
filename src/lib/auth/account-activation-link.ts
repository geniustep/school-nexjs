import type { ApiResponse } from '@/types/api';

export type AccountActivationLinkStage = 'inspect' | 'complete';

const TENANT_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TOKEN_PART_RE = /^[A-Za-z0-9_-]+$/;

export function isAccountActivationLinkToken(value: string): boolean {
  if (!value || value.length > 512 || value.includes('%')) return false;
  const parts = value.split('.');
  return parts.length === 3
    && TENANT_RE.test(parts[0])
    && TOKEN_PART_RE.test(parts[1])
    && TOKEN_PART_RE.test(parts[2]);
}

export function parseAccountActivationLinkPayload(
  stage: AccountActivationLinkStage,
  value: unknown,
): { ok: true; body: { token: string; password?: string } } | { ok: false; reason: 'shape' | 'token' | 'password' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'shape' };
  }
  const payload = value as Record<string, unknown>;
  const expected = stage === 'inspect' ? ['token'] : ['token', 'password'];
  if (Object.keys(payload).length !== expected.length
    || Object.keys(payload).some((key) => !expected.includes(key))) {
    return { ok: false, reason: 'shape' };
  }
  if (typeof payload.token !== 'string' || !isAccountActivationLinkToken(payload.token)) {
    return { ok: false, reason: 'token' };
  }
  const token = payload.token;
  if (stage === 'inspect') return { ok: true, body: { token } };
  if (typeof payload.password !== 'string' || !payload.password || payload.password.length > 512) {
    return { ok: false, reason: 'password' };
  }
  return { ok: true, body: { token, password: payload.password } };
}

export function accountActivationLinkError(code: string): ApiResponse<never> {
  return { success: false, error: { code, message: 'Account activation failed.', details: {} }, meta: {} };
}
