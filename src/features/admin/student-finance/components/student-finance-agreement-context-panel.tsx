'use client';

import { useCallback, useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import type { StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementActionItem } from '../types/agreement-context';
import { postResetFinancialAgreement } from '../api/finance-admin-api';
import { resolveFeePlanPresentation } from '../utils/resolve-fee-plan-presentation';
import { resolveAgreementStatusPresentation } from '../utils/resolve-agreement-status-presentation';
import {
  hasFinanceOperationsHistoryApi,
  resolveFinanceOperationsHistory,
} from '../utils/resolve-finance-operations-history';
import { resolveFinanceAgreementActions } from '../utils/resolve-finance-agreement-actions';
import { resolveResetFinancialAgreementPresentation } from '../utils/resolve-reset-financial-agreement-action';
import { resolveFinanceAgreementStateLabel } from '../utils/reference-labels';

function statusPillClass(tone: string): string {
  return `student-finance-status-pill student-finance-status-pill--${tone === 'ok' ? 'ok' : tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : 'neutral'}`;
}

function AgreementActionButton({
  action,
  loading,
  onClick,
}: {
  action: FinanceAgreementActionItem;
  loading?: boolean;
  onClick?: () => void;
}) {
  const t = useT();
  const className = action.primary ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm';
  const title = !action.enabled && action.disabledTooltipKey ? t(action.disabledTooltipKey) : undefined;

  return (
    <button
      type="button"
      className={className}
      disabled={!action.enabled || loading}
      title={title}
      onClick={onClick}
    >
      {t(action.labelKey)}
    </button>
  );
}

export function StudentFinanceAgreementContextPanel({
  studentId,
  details,
  workspace,
  financialOverview,
  agreement,
  collectBlockReason,
  onOpenAgreements,
  onCreateAgreement,
  onRefresh,
}: {
  studentId: number;
  details: StudentDetailsData;
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  agreement?: FinancialAgreement | null;
  collectBlockReason?: string | null;
  onOpenAgreements?: () => void;
  onCreateAgreement?: () => void;
  onRefresh?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const feePlan = useMemo(
    () => resolveFeePlanPresentation({ workspace, financialOverview, details }),
    [workspace, financialOverview, details],
  );

  const agreementStatus = useMemo(
    () =>
      resolveAgreementStatusPresentation({
        workspace,
        financialOverview,
        collectBlockReason,
      }),
    [workspace, financialOverview, collectBlockReason],
  );

  const resetPresentation = useMemo(
    () => resolveResetFinancialAgreementPresentation({ workspace, financialOverview }),
    [workspace, financialOverview],
  );

  const actions = useMemo(
    () =>
      resolveFinanceAgreementActions({
        workspace,
        financialOverview,
        agreement,
        resetVisible: resetPresentation.visible,
        resetEnabled: resetPresentation.enabled,
      }),
    [workspace, financialOverview, agreement, resetPresentation],
  );

  const operations = useMemo(() => resolveFinanceOperationsHistory(workspace), [workspace]);
  const operationsApiAvailable = hasFinanceOperationsHistoryApi(workspace);

  const handleActionClick = useCallback(
    (action: FinanceAgreementActionItem) => {
      if (action.kind === 'reset_financial_agreement') {
        if (!action.enabled) {
          toast.show(t('admin.student360.financeWorkspace.agreementContext.reset.serverUnavailable'), 'info');
          return;
        }
        setResetOpen(true);
        return;
      }
      if (action.kind === 'create_agreement') {
        onCreateAgreement?.();
        return;
      }
      onOpenAgreements?.();
    },
    [onCreateAgreement, onOpenAgreements, t, toast],
  );

  const handleResetConfirm = useCallback(async () => {
    const reason = resetReason.trim();
    if (!reason) {
      toast.error(t('admin.student360.financeWorkspace.agreementContext.reset.reasonRequired'));
      return;
    }
    if (!resetPresentation.endpointAvailable) {
      toast.show(t('admin.student360.financeWorkspace.agreementContext.reset.serverUnavailable'), 'info');
      return;
    }
    setResetLoading(true);
    const res = await postResetFinancialAgreement(studentId, { reason });
    setResetLoading(false);
    if (!res.success) {
      toast.error(res.error.message || t('admin.student360.financeWorkspace.agreementContext.reset.serverUnavailable'));
      return;
    }
    toast.success(t('admin.student360.financeWorkspace.agreementContext.reset.success'));
    setResetOpen(false);
    setResetReason('');
    onRefresh?.();
  }, [onRefresh, resetPresentation.endpointAvailable, resetReason, studentId, t, toast]);

  const renderPerformedBy = (performedByKey: string, performedByLabel: string) => {
    if (performedByKey.endsWith('performedByUser') && performedByLabel) {
      return t('admin.student360.financeWorkspace.agreementContext.performedByUser', {
        user: performedByLabel,
      });
    }
    if (performedByKey.endsWith('performedBySystem')) {
      return t('admin.student360.financeWorkspace.agreementContext.performedBySystem');
    }
    return t('admin.student360.financeWorkspace.agreementContext.performedByUnavailable');
  };

  return (
    <section className="student-finance-agreement-context" aria-label={t('admin.student360.financeWorkspace.agreementContext.sectionAria')}>
      <div className="student-finance-agreement-context__grid">
        <article className="student-finance-agreement-context__card">
          <header className="student-finance-agreement-context__card-head">
            <h3>{t('admin.student360.financeWorkspace.agreementContext.feePlanTitle')}</h3>
            {feePlan.agreementUiStatus === 'active' ? (
              <span className={statusPillClass('ok')}>
                {t('admin.student360.financeWorkspace.agreementContext.status.active')}
              </span>
            ) : feePlan.showAsInactive && feePlan.agreementState ? (
              <span className={statusPillClass('danger')}>
                {resolveFinanceAgreementStateLabel(t, feePlan.agreementState, { hasBillableContext: true })}
              </span>
            ) : null}
          </header>
          {!feePlan.hasValidPlan ? (
            <p className="student-finance-agreement-context__empty">
              {t('admin.student360.financeWorkspace.agreementContext.noValidFeePlan')}
            </p>
          ) : (
            <dl className="student-finance-agreement-context__facts">
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.feePlanName')}</dt>
                <dd dir="auto">{feePlan.feePlanName ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.feePlanId')}</dt>
                <dd className="mono">{feePlan.feePlanId ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.finance.academicYear')}</dt>
                <dd>{feePlan.academicYear ?? t('common.dash')}</dd>
              </div>
              {feePlan.cycleLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.cycle')}</dt>
                  <dd dir="auto">{feePlan.cycleLabel}</dd>
                </div>
              ) : null}
              {feePlan.levelLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.level')}</dt>
                  <dd dir="auto">{feePlan.levelLabel}</dd>
                </div>
              ) : null}
              {feePlan.classLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.class')}</dt>
                  <dd dir="auto">{feePlan.classLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.agreementNumber')}</dt>
                <dd dir="auto" className="mono">{feePlan.agreementNumber ?? t('common.dash')}</dd>
              </div>
              {feePlan.billingPartnerLabel ? (
                <div>
                  <dt>{t('admin.finance.billingPartner')}</dt>
                  <dd dir="auto">{feePlan.billingPartnerLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.agreementState')}</dt>
                <dd>
                  {feePlan.agreementState
                    ? resolveFinanceAgreementStateLabel(t, feePlan.agreementState, {
                        hasBillableContext: feePlan.showAsInactive,
                      })
                    : t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.validFrom')}</dt>
                <dd>{feePlan.validFrom ? formatDate(feePlan.validFrom) : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.validUntil')}</dt>
                <dd>{feePlan.validUntil ? formatDate(feePlan.validUntil) : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.grossAmount')}</dt>
                <dd><FinanceMoney amount={feePlan.grossAmount} currency={feePlan.currency ?? undefined} /></dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.discountAmount')}</dt>
                <dd><FinanceMoney amount={feePlan.discountAmount} currency={feePlan.currency ?? undefined} /></dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.netAmount')}</dt>
                <dd><FinanceMoney amount={feePlan.netAmount} currency={feePlan.currency ?? undefined} /></dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementContext.fields.remainingAmount')}</dt>
                <dd><FinanceMoney amount={feePlan.remainingAmount} currency={feePlan.currency ?? undefined} /></dd>
              </div>
            </dl>
          )}
        </article>

        <article className="student-finance-agreement-context__card">
          <header className="student-finance-agreement-context__card-head">
            <h3>{t('admin.student360.financeWorkspace.agreementContext.statusTitle')}</h3>
            <span className={statusPillClass(agreementStatus.tone === 'ok' ? 'ok' : agreementStatus.tone === 'danger' ? 'danger' : agreementStatus.tone === 'warn' ? 'warn' : 'neutral')}>
              {t(agreementStatus.stateLabelKey)}
            </span>
          </header>
          {agreementStatus.agreementNumber ? (
            <p className="student-finance-agreement-context__ref mono">{agreementStatus.agreementNumber}</p>
          ) : null}
          {agreementStatus.showCollectBlockedAlert && agreementStatus.collectBlockedAlertKey ? (
            <div className="student-finance-agreement-context__alert" role="alert">
              {t(agreementStatus.collectBlockedAlertKey)}
            </div>
          ) : null}
          {actions.length ? (
            <div className="student-finance-agreement-context__actions">
              {actions.map((action) => (
                <AgreementActionButton
                  key={action.kind}
                  action={action}
                  loading={resetLoading && action.kind === 'reset_financial_agreement'}
                  onClick={() => handleActionClick(action)}
                />
              ))}
            </div>
          ) : null}
        </article>
      </div>

      <section className="student-finance-agreement-context__history">
        <header className="student-finance-agreement-context__history-head">
          <h3>{t('admin.student360.financeWorkspace.agreementContext.operationsHistoryTitle')}</h3>
        </header>
        {operations.length ? (
          <div className="student-finance-agreement-context__history-table-wrap">
            <table className="student-finance-agreement-context__history-table">
              <thead>
                <tr>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.operations.columns.date')}</th>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.operations.columns.type')}</th>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.operations.columns.description')}</th>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.performedByLabel')}</th>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.operations.columns.state')}</th>
                  <th>{t('admin.student360.financeWorkspace.agreementContext.operations.columns.reference')}</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date ? formatDate(entry.date) : t('common.dash')}</td>
                    <td>{t(entry.operationLabelKey)}</td>
                    <td dir="auto">{entry.description ?? t('common.dash')}</td>
                    <td dir="auto">{renderPerformedBy(entry.performedByKey, entry.performedByLabel)}</td>
                    <td>{entry.state ?? t('common.dash')}</td>
                    <td dir="auto" className="mono">{entry.reference ?? t('common.dash')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="student-finance-agreement-context__empty">
            {operationsApiAvailable
              ? t('admin.student360.financeWorkspace.agreementContext.operations.empty')
              : t('admin.student360.financeWorkspace.agreementContext.operations.unavailable')}
          </p>
        )}
      </section>

      <ConfirmationDialog
        open={resetOpen}
        title={t('admin.student360.financeWorkspace.agreementContext.reset.title')}
        confirmLabel={t('admin.student360.financeWorkspace.agreementContext.actions.resetFinancialAgreement')}
        cancelLabel={t('common.cancel')}
        loading={resetLoading}
        onConfirm={() => void handleResetConfirm()}
        onClose={() => {
          if (resetLoading) return;
          setResetOpen(false);
          setResetReason('');
        }}
        body={
          <>
            <p>{t(resetPresentation.reasonKey)}</p>
            <label className="student-finance-agreement-context__reset-reason">
              <span>{t('admin.student360.financeWorkspace.agreementContext.reset.reasonField')}</span>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                rows={3}
                required
              />
            </label>
          </>
        }
      />
    </section>
  );
}
