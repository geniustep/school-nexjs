import type { ApiResponse } from '@/types/api';

export type AccountActivationStage = 'verify' | 'set-password';

export function parseActivationPayload(
  stage: AccountActivationStage,
  value: unknown,
): { ok: true; body: Record<string, string> } | { ok: false } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  const payload = value as Record<string, unknown>;
  const expected = stage === 'verify'
    ? ['phone', 'otp']
    : ['setup_token', 'password', 'password_confirm'];
  if (Object.keys(payload).some((key) => !expected.includes(key))) return { ok: false };
  if (expected.some((key) => typeof payload[key] !== 'string')) return { ok: false };

  if (stage === 'verify') {
    const phone = (payload.phone as string).trim();
    const otp = (payload.otp as string).trim();
    if (!phone || phone.length > 32 || !/^\d{6}$/.test(otp)) return { ok: false };
    return { ok: true, body: { phone, otp } };
  }

  const setupToken = (payload.setup_token as string).trim();
  const password = payload.password as string;
  const passwordConfirm = payload.password_confirm as string;
  if (!setupToken || setupToken.length > 512 || !password || password.length > 512) {
    return { ok: false };
  }
  if (password !== passwordConfirm) return { ok: false };
  return {
    ok: true,
    body: { setup_token: setupToken, password, password_confirm: passwordConfirm },
  };
}

export function activationError(
  code: string,
  message: string,
): ApiResponse<never> {
  return { success: false, error: { code, message, details: {} }, meta: {} };
}
