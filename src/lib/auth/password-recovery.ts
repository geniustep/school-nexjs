import type { ApiResponse } from '@/types/api';

export type PasswordRecoveryStage = 'request' | 'verify' | 'complete';

const MOROCCAN_LOCAL_PHONE = /^0[5-7]\d{8}$/;
const MOROCCAN_INTL_PHONE = /^(?:\+212|212|00212)[5-7]\d{8}$/;

export function isPlausibleRecoveryPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!compact) return false;
  return MOROCCAN_LOCAL_PHONE.test(compact) || MOROCCAN_INTL_PHONE.test(compact);
}

export type PasswordRecoveryRequestBody = { phone: string };
export type PasswordRecoveryVerifyBody = { phone: string; otp: string };
export type PasswordRecoveryCompleteBody = {
  recovery_token: string;
  password: string;
  password_confirm: string;
};

export type PasswordRecoveryBody =
  | PasswordRecoveryRequestBody
  | PasswordRecoveryVerifyBody
  | PasswordRecoveryCompleteBody;

export function parsePasswordRecoveryPayload(
  stage: PasswordRecoveryStage,
  value: unknown,
): { ok: true; body: PasswordRecoveryBody } | { ok: false } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  const payload = value as Record<string, unknown>;

  if (stage === 'request') {
    if (Object.keys(payload).some((key) => key !== 'phone')) return { ok: false };
    if (typeof payload.phone !== 'string') return { ok: false };
    const phone = payload.phone.trim();
    if (!phone || phone.length > 64 || !isPlausibleRecoveryPhone(phone)) return { ok: false };
    return { ok: true, body: { phone } };
  }

  if (stage === 'verify') {
    const expected = new Set(['phone', 'otp']);
    if (Object.keys(payload).some((key) => !expected.has(key))) return { ok: false };
    if (typeof payload.phone !== 'string' || typeof payload.otp !== 'string') {
      return { ok: false };
    }
    const phone = payload.phone.trim();
    const otp = payload.otp.trim();
    if (!phone || phone.length > 64 || !isPlausibleRecoveryPhone(phone) || !/^\d{6}$/.test(otp)) return { ok: false };
    return { ok: true, body: { phone, otp } };
  }

  const expected = new Set(['recovery_token', 'password', 'password_confirm']);
  if (Object.keys(payload).some((key) => !expected.has(key))) return { ok: false };
  if (
    typeof payload.recovery_token !== 'string'
    || typeof payload.password !== 'string'
    || typeof payload.password_confirm !== 'string'
  ) {
    return { ok: false };
  }
  const recoveryToken = payload.recovery_token.trim();
  const password = payload.password;
  const passwordConfirm = payload.password_confirm;
  if (!recoveryToken || recoveryToken.length > 1024 || !password || password.length > 512) {
    return { ok: false };
  }
  return {
    ok: true,
    body: {
      recovery_token: recoveryToken,
      password,
      password_confirm: passwordConfirm,
    },
  };
}

export function passwordRecoveryError(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details: {} },
    meta: {},
  };
}

export function parseRetryAfterSeconds(value: string | null, fallback = 60): number {
  if (!value) return fallback;
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return fallback;
}
