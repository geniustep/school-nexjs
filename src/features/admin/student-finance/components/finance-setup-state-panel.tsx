'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import {
  buildStudentFinanceOverviewHref,
  buildStudentFinanceScheduleHref,
  type FinanceSetupState,
} from '../utils/resolve-finance-setup-state';
import { buildStudentFinanceAgreementsHref } from '../utils/resolve-pre-active-financial-agreement';

function tk(key: string): string {
  return `admin.student360.finance.assignPlan.setupState.${key}`;
}

export function FinanceSetupStatePanel({
  studentId,
  setupState,
  onOpenAgreements,
  onOpenSchedule,
  onOpenOverview,
  onReviewDraft,
  onSetupPlan,
  surface = 'workspace',
  regularizeSlot,
}: {
  studentId: number;
  setupState: FinanceSetupState;
  onOpenAgreements?: () => void;
  onOpenSchedule?: () => void;
  onOpenOverview?: () => void;
  onReviewDraft?: () => void;
  onSetupPlan?: () => void;
  /**
   * Where the panel is rendered. When `agreements`, the user is already inside
   * the agreements sub-tab, so the redundant "open agreements" button is hidden.
   */
  surface?: 'workspace' | 'agreements';
  /**
   * Optional real "create agreement from current installments" CTA, owned by the
   * agreements tab. When provided (agreements surface), it becomes the primary
   * action for the `assigned_fees_without_active_agreement` state.
   */
  regularizeSlot?: ReactNode;
}) {
  const t = useT();
  const { kind, preActiveAgreement, inactiveAgreement } = setupState;
  const inAgreementsTab = surface === 'agreements';

  const agreementsHref = buildStudentFinanceAgreementsHref(studentId);
  const scheduleHref = buildStudentFinanceScheduleHref(studentId);
  const overviewHref = buildStudentFinanceOverviewHref(studentId);

  if (kind === 'clean_no_finance') {
    return (
      <section className="student-finance-setup-state card">
        <h3 className="student-finance-setup-state__title">{t(tk('clean.title'))}</h3>
        <p className="student-finance-setup-state__desc">{t(tk('clean.description'))}</p>
        <div className="student-finance-setup-state__actions">
          <button type="button" className="btn btn--primary" onClick={onSetupPlan}>
            {t('admin.student360.finance.assignPlan.setupAction')}
          </button>
        </div>
      </section>
    );
  }

  if (kind === 'pre_active_agreement' && preActiveAgreement) {
    return (
      <section className="student-finance-setup-state card student-finance-setup-state--pre-active">
        <p className="student-finance-setup-state__eyebrow">
          {t('admin.student360.finance.assignPlan.preActive.badge')}
        </p>
        <h3 className="student-finance-setup-state__title">{t(tk('preActive.title'))}</h3>
        <p className="student-finance-setup-state__desc">{t(tk('preActive.description'))}</p>
        {preActiveAgreement.number ? (
          <p className="student-finance-setup-state__ref mono">{preActiveAgreement.number}</p>
        ) : null}
        <div className="student-finance-setup-state__actions">
          {onReviewDraft ? (
            <button type="button" className="btn btn--primary" onClick={onReviewDraft}>
              {t(tk('preActive.reviewAction'))}
            </button>
          ) : (
            <Link href={agreementsHref} className="btn btn--primary">
              {t(tk('preActive.reviewAction'))}
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (kind === 'assigned_fees_without_active_agreement') {
    // Inside the agreements tab the actionable step is to regularize the file
    // (create an agreement from the current installments). The schedule link is
    // the secondary action, and the redundant "open agreements" button is gone.
    const scheduleButton = onOpenSchedule ? (
      <button
        type="button"
        className={inAgreementsTab ? 'btn btn--ghost' : 'btn btn--primary'}
        onClick={onOpenSchedule}
      >
        {t(tk('openSchedule'))}
      </button>
    ) : (
      <Link href={scheduleHref} className={inAgreementsTab ? 'btn btn--ghost' : 'btn btn--primary'}>
        {t(tk('openSchedule'))}
      </Link>
    );

    return (
      <section className="student-finance-setup-state card student-finance-setup-state--assigned-fees">
        <h3 className="student-finance-setup-state__title">
          {t(inAgreementsTab ? tk('assignedFees.agreementsTabTitle') : tk('assignedFees.title'))}
        </h3>
        <p className="student-finance-setup-state__desc">
          {t(inAgreementsTab ? tk('assignedFees.agreementsTabDescription') : tk('assignedFees.description'))}
        </p>
        <div className="student-finance-setup-state__actions">
          {inAgreementsTab ? (
            <>
              {regularizeSlot}
              {scheduleButton}
            </>
          ) : (
            <>
              {scheduleButton}
              {onOpenAgreements ? (
                <button type="button" className="btn btn--ghost" onClick={onOpenAgreements}>
                  {t(tk('openAgreements'))}
                </button>
              ) : (
                <Link href={agreementsHref} className="btn btn--ghost">
                  {t(tk('openAgreements'))}
                </Link>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  if (kind === 'cancelled_or_inactive_agreement_with_fees') {
    return (
      <section className="student-finance-setup-state card student-finance-setup-state--inactive">
        <h3 className="student-finance-setup-state__title">{t(tk('inactiveWithFees.title'))}</h3>
        <p className="student-finance-setup-state__desc">{t(tk('inactiveWithFees.description'))}</p>
        {inactiveAgreement?.number ? (
          <p className="student-finance-setup-state__ref mono">{inactiveAgreement.number}</p>
        ) : inactiveAgreement?.id != null ? (
          <p className="student-finance-setup-state__ref mono">#{inactiveAgreement.id}</p>
        ) : null}
        <div className="student-finance-setup-state__actions">
          {onOpenSchedule ? (
            <button type="button" className="btn btn--primary" onClick={onOpenSchedule}>
              {t(tk('openSchedule'))}
            </button>
          ) : (
            <Link href={scheduleHref} className="btn btn--primary">
              {t(tk('openSchedule'))}
            </Link>
          )}
          {inAgreementsTab ? null : onOpenAgreements ? (
            <button type="button" className="btn btn--ghost" onClick={onOpenAgreements}>
              {t(tk('openAgreements'))}
            </button>
          ) : (
            <Link href={agreementsHref} className="btn btn--ghost">
              {t(tk('openAgreements'))}
            </Link>
          )}
          {onOpenOverview ? (
            <button type="button" className="btn btn--ghost" onClick={onOpenOverview}>
              {t(tk('openOverview'))}
            </button>
          ) : (
            <Link href={overviewHref} className="btn btn--ghost">
              {t(tk('openOverview'))}
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (kind === 'unknown_or_api_gap') {
    return (
      <section className="student-finance-setup-state card student-finance-setup-state--unknown">
        <h3 className="student-finance-setup-state__title">{t(tk('unknown.title'))}</h3>
        <p className="student-finance-setup-state__desc">{t(tk('unknown.description'))}</p>
        <div className="student-finance-setup-state__actions">
          {onOpenOverview ? (
            <button type="button" className="btn btn--primary" onClick={onOpenOverview}>
              {t(tk('openOverview'))}
            </button>
          ) : (
            <Link href={overviewHref} className="btn btn--primary">
              {t(tk('openOverview'))}
            </Link>
          )}
          {inAgreementsTab ? null : onOpenAgreements ? (
            <button type="button" className="btn btn--ghost" onClick={onOpenAgreements}>
              {t(tk('openAgreements'))}
            </button>
          ) : (
            <Link href={agreementsHref} className="btn btn--ghost">
              {t(tk('openAgreements'))}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return null;
}
