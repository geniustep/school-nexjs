'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';

export function AutoSetupCtaBanner({ available }: { available: boolean }) {
  const t = useT();
  if (!available) return null;

  return (
    <section className="auto-setup-cta-banner" aria-labelledby="auto-setup-cta-title">
      <div className="auto-setup-cta-banner__copy">
        <h2 id="auto-setup-cta-title" className="admin-section__title">
          {t('admin.academicSetup.autoSetup.ctaTitle')}
        </h2>
        <p className="muted">{t('admin.academicSetup.autoSetup.ctaDesc')}</p>
      </div>
      <Link href="/admin/settings/academic-setup/initialize" className="btn btn--primary">
        {t('admin.academicSetup.autoSetup.ctaAction')}
      </Link>
    </section>
  );
}
