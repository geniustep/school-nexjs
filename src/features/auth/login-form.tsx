'use client';

// Login form. Talks to the BFF /api/auth/login route, then redirects by role.

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/client';
import { homeForUser } from '@/lib/routes/role-routes';
import { useT } from '@/features/i18n/locale-context';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LoginHeroPanel } from '@/features/auth/login-hero-panel';
import { loginBrandingStyle, loginPageBranded } from '@/lib/public-school-branding/client';
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

  return (
    <div
      className="login-page"
      data-branded={branded ? 'true' : undefined}
      style={pageStyle}
    >
      <div className="login-page__hero">
        <div className="login-page__hero-compact">
          <LoginHeroPanel branding={branding} compact />
        </div>
        <div className="login-page__hero-full">
          <LoginHeroPanel branding={branding} />
        </div>
      </div>
      <div className="login-page__form">
        <div className="login-card">
          <div className="login-card__brand">
            <BrandLogo variant="full" />
          </div>
          <h1>{t('auth.welcome')}</h1>
          <p className="sub">{t('auth.subtitle')}</p>

          {expired && (
            <div className="form-error" style={{ background: 'var(--c-amber-soft)', color: 'var(--c-amber)' }}>
              {t('auth.sessionExpired')}
            </div>
          )}
          {error && <div className="form-error">{error}</div>}

          <form onSubmit={onSubmit}>
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
              />
            </div>
            <button className="btn btn--primary btn--block mt-2" type="submit" disabled={submitting}>
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
