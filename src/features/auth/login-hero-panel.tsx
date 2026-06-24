'use client';

import { useT } from '@/features/i18n/locale-context';
import { loginSchoolBrand } from '@/lib/login-school-brand';
import { LoginSchoolMark } from '@/features/auth/login-school-mark';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

export function LoginHeroPanel({
  branding,
  compact = false,
}: {
  branding: LoginSchoolBrandingView;
  compact?: boolean;
}) {
  const t = useT();

  const schoolName = branding.fromApi
    ? (branding.schoolName ?? t('auth.hero.schoolNameDefault'))
    : (loginSchoolBrand.schoolDisplayName ?? t('auth.hero.schoolNameDefault'));

  const greeting = branding.fromApi
    ? (branding.welcomeSubtitle ?? t('auth.hero.welcome'))
    : t('auth.hero.welcome');

  const yearLabel = branding.fromApi
    ? branding.academicYearLabel
    : t('auth.hero.academicYear', { year: loginSchoolBrand.academicYear });

  return (
    <aside
      className={compact ? 'login-welcome login-welcome--compact' : 'login-welcome'}
      aria-label={t('auth.hero.panelLabel')}
    >
      <div className="login-welcome__mark">
        <LoginSchoolMark branding={branding} schoolLabel={schoolName} compact={compact} />
      </div>

      {yearLabel ? <span className="login-welcome__year">{yearLabel}</span> : null}

      <h2 className="login-welcome__school">{schoolName}</h2>
      <p className="login-welcome__greeting">{greeting}</p>
      <p className="login-welcome__note">{t('auth.hero.secureNote')}</p>
    </aside>
  );
}
