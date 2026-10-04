'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { LoginAmbientBackground } from '@/features/auth/login-branded-background';
import { LoginBrandPanel } from '@/features/auth/login-brand-panel';
import { useT } from '@/features/i18n/locale-context';
import {
  loginBrandingStyle,
  loginPageBranded,
} from '@/lib/public-school-branding/client';
import { isPlausibleRecoveryPhone, parseRetryAfterSeconds } from '@/lib/auth/password-recovery';
import type { ApiResponse } from '@/types/api';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

type Stage = 'phone' | 'otp' | 'password' | 'done';

type RequestData = { status: 'accepted' };
type VerifyData = { recovery_token: string };
type CompleteData = { status: 'password_updated' };

type RecoveryResult<T> = {
  response: Response | null;
  body: ApiResponse<T>;
};

function networkFailure<T>(): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: 'network_error',
      message: 'Could not reach the server.',
      details: {},
    },
    meta: {},
  };
}

async function postRecovery<T>(
  stage: 'request' | 'verify' | 'complete',
  body: Record<string, string>,
): Promise<RecoveryResult<T>> {
  try {
    const response = await fetch(`/api/auth/password-recovery/${stage}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    let parsed: ApiResponse<T>;
    try {
      parsed = await response.json() as ApiResponse<T>;
    } catch {
      parsed = {
        success: false,
        error: {
          code: 'upstream_error',
          message: 'Unexpected server response.',
          details: {},
        },
        meta: {},
      };
    }
    return { response, body: parsed };
  } catch {
    return { response: null, body: networkFailure<T>() };
  }
}

export function PasswordRecoveryForm({
  branding,
}: {
  branding: LoginSchoolBrandingView;
}) {
  const t = useT();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownRemaining = useMemo(
    () => Math.max(0, Math.ceil((cooldownUntil - now) / 1000)),
    [cooldownUntil, now],
  );

  const branded = loginPageBranded(branding);
  const schoolName = branding.schoolName ?? t('auth.hero.schoolNameDefault');
  const genericAccepted = t('auth.passwordRecovery.requestAccepted');

  function messageFor(code: string) {
    const messages: Record<string, string> = {
      validation_error: t('auth.passwordRecovery.errors.validation'),
      network_error: t('auth.passwordRecovery.errors.network'),
      upstream_error: t('auth.passwordRecovery.errors.network'),
      recovery_unavailable: t('auth.passwordRecovery.errors.unavailable'),
      rate_limited: t('auth.passwordRecovery.errors.rateLimited'),
      recovery_verification_failed: t('auth.passwordRecovery.errors.verificationFailed'),
      password_required: t('auth.passwordRecovery.errors.passwordRequired'),
      password_confirmation_mismatch: t('auth.passwordRecovery.errors.passwordMismatch'),
      password_policy_violation: t('auth.passwordRecovery.errors.passwordPolicy'),
    };
    return messages[code] ?? t('auth.passwordRecovery.errors.generic');
  }

  async function requestOtp({ resend = false }: { resend?: boolean } = {}) {
    if (!phone.trim()) {
      setError(t('auth.passwordRecovery.errors.phoneRequired'));
      return;
    }
    if (!isPlausibleRecoveryPhone(phone)) {
      setError(t('auth.passwordRecovery.errors.phoneInvalid'));
      return;
    }
    if (resend && cooldownRemaining > 0) return;

    setSubmitting(true);
    setError(null);
    if (!resend) setNotice(null);

    const result = await postRecovery<RequestData>('request', { phone: phone.trim() });
    if (result.body.success && result.response?.status === 202) {
      setStage('otp');
      setOtp('');
      setNotice(genericAccepted);
      const seconds = parseRetryAfterSeconds(
        result.response.headers.get('retry-after'),
        60,
      );
      const start = Date.now();
      setNow(start);
      setCooldownUntil(start + seconds * 1000);
      setSubmitting(false);
      return;
    }

    const code = result.body.success ? 'validation_error' : result.body.error.code;
    if (result.response?.status === 429) {
      const seconds = parseRetryAfterSeconds(
        result.response.headers.get('retry-after'),
        60,
      );
      const start = Date.now();
      setNow(start);
      setCooldownUntil(start + seconds * 1000);
    }
    setError(messageFor(code));
    setSubmitting(false);
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(t('auth.passwordRecovery.errors.otpFormat'));
      return;
    }

    setSubmitting(true);
    const result = await postRecovery<VerifyData>('verify', {
      phone: phone.trim(),
      otp: otp.trim(),
    });
    if (
      result.body.success
      && typeof result.body.data.recovery_token === 'string'
      && result.body.data.recovery_token
    ) {
      setRecoveryToken(result.body.data.recovery_token);
      setStage('password');
      setNotice(null);
      setSubmitting(false);
      return;
    }

    const code = result.body.success ? 'recovery_verification_failed' : result.body.error.code;
    setError(messageFor(code));
    setSubmitting(false);
  }

  async function completeRecovery(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!recoveryToken) {
      setError(t('auth.passwordRecovery.errors.verificationFailed'));
      setStage('phone');
      return;
    }
    if (!password) {
      setError(t('auth.passwordRecovery.errors.passwordRequired'));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t('auth.passwordRecovery.errors.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const result = await postRecovery<CompleteData>('complete', {
      recovery_token: recoveryToken,
      password,
      password_confirm: passwordConfirm,
    });

    if (
      result.body.success
      && result.body.data.status === 'password_updated'
    ) {
      setRecoveryToken(null);
      setPassword('');
      setPasswordConfirm('');
      setOtp('');
      setStage('done');
      setSubmitting(false);
      return;
    }

    const code = result.body.success ? 'validation_error' : result.body.error.code;
    setError(messageFor(code));
    setSubmitting(false);
  }

  function changePhone() {
    setStage('phone');
    setOtp('');
    setRecoveryToken(null);
    setPassword('');
    setPasswordConfirm('');
    setError(null);
    setNotice(null);
    setCooldownUntil(0);
  }

  return (
    <div
      className="login-page"
      data-branded={branded ? 'true' : undefined}
      style={loginBrandingStyle(branding)}
    >
      <LoginAmbientBackground />
      <div className="login-page__locale">
        <LocaleSwitcher variant="login" />
      </div>

      <main className="login-page__shell">
        <LoginBrandPanel
          branding={branding}
          schoolName={schoolName}
          tagline={branding.welcomeSubtitle}
          yearLabel={branding.academicYearLabel}
        />

        <div
          className="login-card activation-card password-recovery-card"
          data-submitting={submitting ? 'true' : undefined}
        >
          <div className="login-card__mark">
            <BrandLogo variant="full" className="login-card__raqeem-logo" />
          </div>

          {stage === 'phone' && (
            <>
              <h1 className="login-card__title">{t('auth.passwordRecovery.title')}</h1>
              <p className="login-card__sub">{t('auth.passwordRecovery.intro')}</p>
              {error && <div className="form-error">{error}</div>}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void requestOtp();
                }}
                aria-busy={submitting}
              >
                <div className="field">
                  <label htmlFor="recovery-phone">{t('auth.passwordRecovery.phoneLabel')}</label>
                  <input
                    id="recovery-phone"
                    className="input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={t('auth.passwordRecovery.phonePlaceholder')}
                    required
                    disabled={submitting}
                    dir="ltr"
                  />
                </div>
                <button
                  className="btn btn--primary btn--block login-card__submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? t('auth.passwordRecovery.sending')
                    : t('auth.passwordRecovery.sendCode')}
                </button>
              </form>
              <Link className="activation-card__back" href="/login">
                {t('auth.passwordRecovery.backToLogin')}
              </Link>
            </>
          )}

          {stage === 'otp' && (
            <>
              <h1 className="login-card__title">{t('auth.passwordRecovery.otpTitle')}</h1>
              <p className="login-card__sub">{t('auth.passwordRecovery.otpIntro')}</p>
              {notice && <div className="password-recovery-card__notice">{notice}</div>}
              {error && <div className="form-error">{error}</div>}
              <form onSubmit={verifyOtp} aria-busy={submitting}>
                <div className="field">
                  <label htmlFor="recovery-otp">{t('auth.passwordRecovery.otpLabel')}</label>
                  <input
                    id="recovery-otp"
                    className="input activation-card__otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={submitting}
                    dir="ltr"
                  />
                </div>
                <button
                  className="btn btn--primary btn--block login-card__submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? t('auth.passwordRecovery.verifying')
                    : t('auth.passwordRecovery.verifyCode')}
                </button>
              </form>
              <div className="password-recovery-card__secondary">
                <button type="button" onClick={changePhone} disabled={submitting}>
                  {t('auth.passwordRecovery.changePhone')}
                </button>
                <button
                  type="button"
                  onClick={() => void requestOtp({ resend: true })}
                  disabled={submitting || cooldownRemaining > 0}
                >
                  {cooldownRemaining > 0
                    ? t('auth.passwordRecovery.resendCountdown', { seconds: cooldownRemaining })
                    : t('auth.passwordRecovery.resend')}
                </button>
              </div>
            </>
          )}

          {stage === 'password' && (
            <>
              <h1 className="login-card__title">{t('auth.passwordRecovery.passwordTitle')}</h1>
              <p className="login-card__sub">{t('auth.passwordRecovery.passwordIntro')}</p>
              {error && <div className="form-error">{error}</div>}
              <form onSubmit={completeRecovery} aria-busy={submitting}>
                <div className="field">
                  <label htmlFor="recovery-password">
                    {t('auth.passwordRecovery.newPassword')}
                  </label>
                  <div className="login-password-field">
                    <input
                      id="recovery-password"
                      className="input login-password-field__input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={submitting}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="login-password-field__toggle"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      disabled={submitting}
                    >
                      {showPassword ? '◉' : '○'}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="recovery-password-confirm">
                    {t('auth.passwordRecovery.confirmPassword')}
                  </label>
                  <div className="login-password-field">
                    <input
                      id="recovery-password-confirm"
                      className="input login-password-field__input"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      required
                      disabled={submitting}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="login-password-field__toggle"
                      onClick={() => setShowPasswordConfirm((visible) => !visible)}
                      aria-label={
                        showPasswordConfirm ? t('auth.hidePassword') : t('auth.showPassword')
                      }
                      disabled={submitting}
                    >
                      {showPasswordConfirm ? '◉' : '○'}
                    </button>
                  </div>
                </div>
                <button
                  className="btn btn--primary btn--block login-card__submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? t('auth.passwordRecovery.updating')
                    : t('auth.passwordRecovery.setPassword')}
                </button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <div className="activation-card__success">
              <div>
                <h1 className="login-card__title">{t('auth.passwordRecovery.successTitle')}</h1>
                <p className="login-card__sub">{t('auth.passwordRecovery.successBody')}</p>
              </div>
              <Link className="btn btn--primary btn--block" href="/login">
                {t('auth.passwordRecovery.signIn')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
