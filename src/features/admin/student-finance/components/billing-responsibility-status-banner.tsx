'use client';

import { useT } from '@/features/i18n/locale-context';
import type { BillingResponsibilityPresentation } from '../utils/resolve-billing-responsibility-presentation';

function toneClass(tone: BillingResponsibilityPresentation['tone']): string {
  if (tone === 'danger') return 'student-finance-billing-responsibility-banner--danger';
  if (tone === 'review') return 'student-finance-billing-responsibility-banner--review';
  if (tone === 'warn') return 'student-finance-billing-responsibility-banner--warn';
  return '';
}

export function BillingResponsibilityStatusBanner({
  presentation,
  onSelectResponsible,
}: {
  presentation: BillingResponsibilityPresentation;
  onSelectResponsible?: () => void;
}) {
  const t = useT();

  if (!presentation.showBanner || !presentation.titleKey || !presentation.messageKey) {
    return null;
  }

  return (
    <section
      className={`student-finance-billing-responsibility-banner ${toneClass(presentation.tone)}`.trim()}
      aria-live="polite"
      data-billing-responsibility-status={presentation.status ?? undefined}
    >
      <div className="student-finance-billing-responsibility-banner__head">
        <div>
          <p className="student-finance-billing-responsibility-banner__eyebrow">
            {t('admin.student360.financeWorkspace.billingResponsibility.badge')}
          </p>
          <h3 className="student-finance-billing-responsibility-banner__title">
            {t(presentation.titleKey)}
          </h3>
          <p className="student-finance-billing-responsibility-banner__desc">
            {t(presentation.messageKey)}
          </p>
          {presentation.showReviewWarning ? (
            <p className="student-finance-billing-responsibility-banner__review tiny muted" role="note">
              {t('admin.student360.financeWorkspace.billingResponsibility.legacyUnknown.reviewWarning')}
            </p>
          ) : null}
        </div>
        {presentation.showCta && presentation.ctaKey && onSelectResponsible ? (
          <div className="student-finance-billing-responsibility-banner__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={onSelectResponsible}>
              {t(presentation.ctaKey)}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
