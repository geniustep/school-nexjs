'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/client';
import { homeForUser } from '@/lib/routes/role-routes';
import { useT } from '@/features/i18n/locale-context';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { LoginAmbientBackground } from '@/features/auth/login-branded-background';
import { LoginBrandPanel } from '@/features/auth/login-brand-panel';
import { loginBrandingStyle, loginPageBranded } from '@/lib/public-school-branding/client';
import { loginSchoolBrand } from '@/lib/login-school-brand';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';
import {
  clearActivationLoginHandoff,
  consumeActivationLoginHandoff,
} from '@/lib/auth/account-activation-login-handoff';

function subscribeToActivationLogin() {
  return () => {};
}

function getServerActivationLogin() {
  return '';
}

export function LoginForm({ branding }: { branding: LoginSchoolBrandingView }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get('expired') === '1';
  const activationLogin = useSyncExternalStore(
    subscribeToActivationLogin,
    consumeActivationLoginHandoff,
    getServerActivationLogin,
  );

  const [login, setLogin] = useState('');
  const [loginEdited, setLoginEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const friendlyError: Record<string, string> = {
    invalid_credentials: t('auth.invalidCredentials'),
    inactive_user: t('auth.inactiveUser'),
    unsupported_role: t('auth.unsupportedRole'),
    validation_error: t('auth.validationError'),
    network_error: t('auth.networkError'),
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const submittedLogin = (loginEdited ? login : activationLogin).trim();
    const res = await authApi.login(submittedLogin, password);
    if (res.success) {
      clearActivationLoginHandoff();
      router.replace(homeForUser(res.data.user));
      router.refresh();
      return;
    }
    setError(friendlyError[res.error.code] ?? res.error.message ?? t('auth.signInFailed'));
    setSubmitting(false);
  }

  const branded = loginPageBranded(branding);
  const pageStyle = loginBrandingStyle(branding);

  const schoolName = branding.fromApi
    ? (branding.schoolName ?? t('auth.hero.schoolNameDefault'))
    : (branding.schoolName ?? loginSchoolBrand.schoolDisplayName ?? t('auth.hero.schoolNameDefault'));

  const yearLabel = branding.fromApi
    ? branding.academicYearLabel
    : t('auth.hero.academicYear', { year: loginSchoolBrand.academicYear });

  const tagline = branding.fromApi
    ? branding.welcomeSubtitle
    : t('auth.hero.welcome');

  return (
    <div
      className="login-page"
      data-branded={branded ? 'true' : undefined}
      style={pageStyle}
    >
      <LoginAmbientBackground />

      <div className="login-page__locale">
        <LocaleSwitcher variant="login" />
      </div>

      <main className="login-page__shell">
        <LoginBrandPanel
          branding={branding}
          schoolName={schoolName}
          tagline={tagline}
          yearLabel={yearLabel}
        />

        <div className="login-card" data-submitting={submitting ? 'true' : undefined}>
          <div className="login-card__mark">
            <BrandLogo variant="full" className="login-card__raqeem-logo" />
          </div>
          <h1 className="login-card__title">{t('auth.welcome')}</h1>
          <p className="login-card__sub">{t('auth.subtitle')}</p>

          {expired && (
            <div className="form-error form-error--amber">{t('auth.sessionExpired')}</div>
          )}
          {error && <div className="form-error">{error}</div>}

          <form onSubmit={onSubmit} aria-busy={submitting}>
            <div className="field">
              <label htmlFor="login">{t('auth.loginLabel')}</label>
              <input
                id="login"
                className="input"
                type="text"
                autoComplete="username"
                value={loginEdited ? login : activationLogin}
                onChange={(e) => { setLoginEdited(true); setLogin(e.target.value); }}
                placeholder={t('auth.loginPlaceholder')}
                required
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.passwordLabel')}</label>
              <div className="login-password-field">
                <input
                  id="password"
                  className="input login-password-field__input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={submitting}
                  dir="ltr"
                />
                <button
                  type="button"
                  className="login-password-field__toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  disabled={submitting}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-2.09 3.5M6.61 6.61A11.8 11.8 0 0 0 1 12.5C2.73 16.39 7 19.5 12 19.5c1.56 0 3.04-.3 4.39-.84"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="13" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              className={`btn btn--primary btn--block login-card__submit${submitting ? ' login-card__submit--busy' : ''}`}
              type="submit"
              disabled={submitting}
              aria-live="polite"
            >
              <span className="login-card__submit-inner">
                {submitting ? (
                  <>
                    <span className="login-card__submit-spinner" aria-hidden="true" />
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
