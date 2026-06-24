'use client';

import { useT } from '@/features/i18n/locale-context';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LoginSchoolMark } from '@/features/auth/login-school-mark';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

/** School identity column — branding area, not a login card. */
export function LoginBrandPanel({
  branding,
  schoolName,
  tagline,
  yearLabel,
}: {
  branding: LoginSchoolBrandingView;
  schoolName: string;
  tagline: string | null;
  yearLabel: string | null;
}) {
  const t = useT();

  return (
    <section className="login-brand" aria-label={t('auth.hero.panelLabel')}>
      <div className="login-brand__mark">
        <LoginSchoolMark branding={branding} schoolLabel={schoolName} placement="brand" />
      </div>

      <div className="login-brand__copy">
        <h2 className="login-brand__name">{schoolName}</h2>
        {tagline ? <p className="login-brand__tagline">{tagline}</p> : null}
        {yearLabel ? <p className="login-brand__year">{yearLabel}</p> : null}
      </div>

      <div className="login-brand__platform">
        <BrandLogo variant="full" className="login-brand__platform-logo" />
        <p className="login-brand__platform-text">{t('brand.tagline')}</p>
      </div>
    </section>
  );
}
