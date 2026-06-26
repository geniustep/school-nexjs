'use client';

import Link from 'next/link';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import type { DraftAgreementPresentation } from '../utils/resolve-draft-agreement-presentation';
import type { StudentFinanceActionState } from '../utils/resolve-student-finance-action-state';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

export function DraftAgreementFinanceBanner({
  studentId,
  presentation,
  actionState,
  financialOverview,
  onOpenAgreement,
  onSubmitAgreement,
  submitLoading = false,
}: {
  studentId: number;
  presentation: DraftAgreementPresentation;
  actionState: StudentFinanceActionState;
  financialOverview: StudentFinancialOverview | null;
  onOpenAgreement?: () => void;
  onSubmitAgreement?: () => void;
  submitLoading?: boolean;
}) {
  const t = useT();
  const currency = resolveStudentFinanceCurrency({ financialOverview });
  const summary = presentation.summary;

  if (actionState.scenario !== 'draft_agreement') return null;

  const agreementHref = `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;
  const showSubmit = actionState.canActivateAgreement && !!onSubmitAgreement;

  return (
    <section className="student-finance-draft-banner" aria-live="polite">
      <div className="student-finance-draft-banner__head">
        <div>
          <p className="student-finance-draft-banner__eyebrow">
            {t('admin.student360.financeWorkspace.draftAgreement.badge')}
          </p>
          <h3 className="student-finance-draft-banner__title">
            {t('admin.student360.financeWorkspace.actionState.draft.title')}
          </h3>
          <p className="student-finance-draft-banner__desc">
            {t('admin.student360.financeWorkspace.actionState.draft.impact')}
          </p>
          <p className="student-finance-draft-banner__step tiny muted">
            {t('admin.student360.financeWorkspace.actionState.draft.nextStep')}
          </p>
        </div>
        <div className="student-finance-draft-banner__actions">
          {onOpenAgreement ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenAgreement}>
              {t('admin.student360.financeWorkspace.actionState.reviewDraft')}
            </button>
          ) : (
            <Link href={agreementHref} className="btn btn--ghost btn--sm">
              {t('admin.student360.financeWorkspace.actionState.reviewDraft')}
            </Link>
          )}
          {showSubmit ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={submitLoading}
              onClick={onSubmitAgreement}
            >
              {t('admin.student360.financialAgreement.actions.submit')}
            </button>
          ) : null}
        </div>
      </div>

      <p className="student-finance-draft-banner__note" role="note">
        {t('admin.student360.financeWorkspace.draftAgreement.collectionNote')}
      </p>

      {summary ? (
        <dl className="student-finance-draft-banner__metrics">
          {summary.original_total != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.originalTotal')}</dt>
              <dd>
                <FinanceMoney amount={summary.original_total} currency={currency} />
              </dd>
            </div>
          ) : null}
          {summary.discount_total != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.discountTotal')}</dt>
              <dd>
                <FinanceMoney amount={summary.discount_total} currency={currency} />
              </dd>
            </div>
          ) : null}
          {summary.final_total != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.finalAfterCustomization')}</dt>
              <dd>
                <FinanceMoney amount={summary.final_total} currency={currency} />
              </dd>
            </div>
          ) : null}
          {summary.recurring_total_after_discount != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.recurringAfterDiscount')}</dt>
              <dd>
                <FinanceMoney amount={summary.recurring_total_after_discount} currency={currency} />
              </dd>
            </div>
          ) : null}
          {summary.monthly_due_amount != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.expectedMonthlyDue')}</dt>
              <dd>
                <FinanceMoney amount={summary.monthly_due_amount} currency={currency} />
              </dd>
            </div>
          ) : null}
          {summary.schedule_total != null ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.summary.scheduleTotal')}</dt>
              <dd>
                <FinanceMoney amount={summary.schedule_total} currency={currency} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {presentation.totalsMismatch ? (
        <p className="student-finance-draft-banner__warning" role="note">
          {t('admin.student360.financeWorkspace.draftAgreement.totalsMismatch')}
        </p>
      ) : null}
    </section>
  );
}
