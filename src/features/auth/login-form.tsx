'use client';

import { useState } from 'react';
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

export function LoginForm({ branding }: { branding: LoginSchoolBrandingView }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get('expired') === '1';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
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
    const res = await authApi.login(login.trim(), password);
    if (res.success) {
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
    : (loginSchoolBrand.schoolDisplayName ?? t('auth.hero.schoolNameDefault'));

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
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder={t('auth.loginPlaceholder')}
                required
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.passwordLabel')}</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
              />
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
