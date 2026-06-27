'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { AgreementStateBadge } from './agreement-state-badge';
import type { ParallelDraftAgreementsPresentation } from '../utils/resolve-parallel-draft-agreements';

export function ParallelDraftAgreementsBanner({
  presentation,
}: {
  presentation: ParallelDraftAgreementsPresentation;
}) {
  const t = useT();

  if (!presentation.showBanner || presentation.primaryDraftHref == null) return null;

  const primaryDraft = presentation.drafts[0];
  const agreementLabel =
    primaryDraft?.number ?? primaryDraft?.name ?? `#${presentation.primaryDraftId}`;
  const titleKey =
    presentation.count > 1
      ? 'admin.student360.financeWorkspace.parallelDraftAgreements.titleWithCount'
      : 'admin.student360.financeWorkspace.parallelDraftAgreements.title';

  return (
    <section
      className="student-finance-section student-finance-draft-banner student-finance-parallel-draft-banner"
      role="note"
      aria-live="polite"
    >
      <div className="student-finance-draft-banner__head">
        <div>
          <p className="student-finance-draft-banner__eyebrow">
            {t('admin.student360.financeWorkspace.parallelDraftAgreements.badge')}
          </p>
          <h3 className="student-finance-draft-banner__title">{t(titleKey, { count: String(presentation.count) })}</h3>
          <div className="student-finance-parallel-draft-banner__meta">
            <AgreementStateBadge state="draft" financeContext />
            <span className="mono student-finance-parallel-draft-banner__number" dir="auto">
              {agreementLabel}
            </span>
          </div>
        </div>
        <div className="student-finance-draft-banner__actions">
          <Link href={presentation.primaryDraftHref} className="btn btn--primary btn--sm">
            {t('admin.student360.financeWorkspace.parallelDraftAgreements.openInFinanceHub')}
          </Link>
          {presentation.count > 1 ? (
            <Link href={presentation.financeHubListHref} className="btn btn--ghost btn--sm">
              {t('admin.student360.financeWorkspace.parallelDraftAgreements.viewAllInFinanceHub')}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
