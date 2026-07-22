'use client';

import Link from 'next/link';
import { IconLayers } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';

export function AutoSetupCtaBanner({ available }: { available: boolean }) {
  const t = useT();
  if (!available) return null;

  return (
    <section className="auto-setup-cta-banner" aria-labelledby="auto-setup-cta-title">
      <div className="auto-setup-cta-banner__identity">
        <span className="auto-setup-cta-banner__mark" aria-hidden>
          <IconLayers size={20} />
        </span>
        <div className="auto-setup-cta-banner__copy">
          <h2 id="auto-setup-cta-title" className="auto-setup-cta-banner__title">
            {t('admin.academicSetup.autoSetup.ctaTitle')}
          </h2>
          <p className="auto-setup-cta-banner__desc">
            {t('admin.academicSetup.autoSetup.ctaDesc')}
          </p>
        </div>
      </div>
      <Link href="/admin/settings/academic-setup/initialize" className="btn btn--primary auto-setup-cta-banner__action">
        {t('admin.academicSetup.autoSetup.ctaAction')}
      </Link>
    </section>
  );
}
