'use client';

import { useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { useFinanceRepairDiagnostics } from '../hooks/use-finance-repair-diagnostics';
import { FinanceRepairActionPreviewDrawer } from './finance-repair-action-preview-drawer';
import {
  KEEP_FEE_PLAN_ACTION,
  REGULARIZE_AFTER_CLEANUP_ACTION,
  REMOVE_DUPLICATE_PLAN_ACTION,
  type FinanceRepairAction,
} from '../types/finance-repair';
import { canExecuteRepairAction } from '../utils/repair-action-guards';
import { actionRequiresPlanSelection } from '../utils/repair-action-plan-selection';

function tk(key: string): string {
  return `admin.student360.financeWorkspace.repairCenter.${key}`;
}

function actionLabelKey(code: string): string | null {
  if (code === KEEP_FEE_PLAN_ACTION) return 'actionLabels.keepFeePlan';
  if (code === REMOVE_DUPLICATE_PLAN_ACTION) return 'actionLabels.removeDuplicatePlan';
  if (code === REGULARIZE_AFTER_CLEANUP_ACTION) return 'regularizeAction';
  return null;
}

export function FinanceRepairCenterCard({
  studentId,
  currencyName,
  refreshSignal = 0,
  onRepaired,
}: {
  studentId: number;
  currencyName?: string | null;
  refreshSignal?: number;
  onRepaired?: () => void;
}) {
  const t = useT();
  const { initialLoading, diagnostics, error, unavailable, reload } = useFinanceRepairDiagnostics(
    studentId,
    true,
    refreshSignal,
  );
  const [activeAction, setActiveAction] = useState<FinanceRepairAction | null>(null);

  if (unavailable) return null;
  if (initialLoading) {
    return (
      <section className="student-finance-repair-center card" aria-busy="true">
        <p className="muted">{t(tk('loading'))}</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="student-finance-repair-center card">
        <p className="form-error">{t(tk('diagnosticsError'))}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
          {t('common.retry')}
        </button>
      </section>
    );
  }
  if (!diagnostics || !diagnostics.available) return null;

  if (
    diagnostics.health === 'healthy' &&
    !diagnostics.hasAnomalies &&
    diagnostics.actions.length === 0 &&
    diagnostics.blockingReasons.length === 0
  ) {
    return null;
  }

  const statusModifier =
    diagnostics.health === 'blocked'
      ? ' student-finance-repair-center--blocked'
      : diagnostics.health === 'needs_review'
        ? ' student-finance-repair-center--review'
        : ' student-finance-repair-center--healthy';

  const handleApplied = () => {
    setActiveAction(null);
    reload();
    onRepaired?.();
  };

  const canApplyActionsFlag = diagnostics.canApplyActions;

  function resolveActionLabel(action: FinanceRepairAction): string {
    const key = actionLabelKey(action.code);
    if (key) return t(tk(key));
    return action.label ?? t(tk('previewAction'));
  }

  function canOpenPreview(action: FinanceRepairAction): boolean {
    if (!canExecuteRepairAction(action, canApplyActionsFlag)) return false;
    if (!actionRequiresPlanSelection(action.planSelectionMode)) return true;
    return action.candidatePlans.filter((p) => p.removable).length > 0;
  }

  return (
    <section className={`student-finance-repair-center card${statusModifier}`} role="region" aria-label={t(tk('title'))}>
      <header className="student-finance-repair-center__head">
        <div className="student-finance-repair-center__heading">
          <h3 className="student-finance-repair-center__title">{t(tk('title'))}</h3>
          <p className="tiny muted">{t(tk('subtitle'))}</p>
        </div>
        <span
          className={`student-finance-repair-center__status student-finance-repair-center__status--${diagnostics.health}`}
        >
          {t(tk('statusLabel'))}: {t(tk(`status.${diagnostics.health}`))}
        </span>
      </header>

      {diagnostics.hasAnomalies ? (
        <div className="student-finance-repair-center__anomalies">
          <h4 className="student-finance-repair-center__section-title">{t(tk('anomaliesTitle'))}</h4>
          <ul className="student-finance-repair-anomaly-list">
            {diagnostics.anomalies.map((anomaly, index) => (
              <li
                key={`${anomaly.code}-${index}`}
                className={`student-finance-repair-anomaly student-finance-repair-anomaly--${anomaly.severity}`}
              >
                <p className="student-finance-repair-anomaly__title" dir="auto">
                  {anomaly.title ?? anomaly.code}
                </p>
                {anomaly.description ? (
                  <p className="student-finance-repair-anomaly__desc tiny muted" dir="auto">
                    {anomaly.description}
                  </p>
                ) : null}
                {anomaly.impacts.length > 0 || anomaly.impactAmount != null ? (
                  <div className="student-finance-repair-anomaly__impact">
                    <span className="tiny muted">{t(tk('impactTitle'))}:</span>{' '}
                    {anomaly.impacts.length > 0 ? (
                      <span dir="auto">{anomaly.impacts.join('، ')}</span>
                    ) : null}
                    {anomaly.impactAmount != null ? (
                      <FinanceMoney amount={anomaly.impactAmount} currency={currencyName ?? undefined} />
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted">{t(tk('healthyBody'))}</p>
      )}

      {diagnostics.blockingReasons.length > 0 ? (
        <div className="student-finance-repair-center__blockers" role="note">
          <h4 className="student-finance-repair-center__section-title">
            {t(tk('blockedReasonsTitle'))}
          </h4>
          <ul className="student-finance-repair-reason-list student-finance-repair-reason-list--blocking">
            {diagnostics.blockingReasons.map((reason, index) => (
              <li key={`${reason.code}-${index}`} dir="auto">
                {reason.message ?? reason.code}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics.actions.length > 0 ? (
        <div className="student-finance-repair-center__actions">
          <h4 className="student-finance-repair-center__section-title">{t(tk('actionsTitle'))}</h4>
          <ul className="student-finance-repair-action-list">
            {diagnostics.actions.map((action) => {
              const isRegularize = action.code === REGULARIZE_AFTER_CLEANUP_ACTION;
              const displayLabel = resolveActionLabel(action);
              const previewAllowed = canOpenPreview(action);
              const needsPlan = actionRequiresPlanSelection(action.planSelectionMode);
              const insufficientPlans =
                needsPlan && action.candidatePlans.filter((p) => p.removable).length === 0;

              return (
                <li key={action.code} className="student-finance-repair-action">
                  <div className="student-finance-repair-action__copy">
                    <p className="student-finance-repair-action__label" dir="auto">
                      {displayLabel}
                    </p>
                    {action.description ? (
                      <p className="tiny muted" dir="auto">
                        {action.description}
                      </p>
                    ) : null}
                    {insufficientPlans ? (
                      <p className="tiny muted">{t(tk('planSelection.insufficientPlans'))}</p>
                    ) : null}
                    {action.isBlocked && action.blockingReasons.length > 0 ? (
                      <ul className="student-finance-repair-reason-list student-finance-repair-reason-list--blocking tiny">
                        {action.blockingReasons.map((reason, index) => (
                          <li key={`${reason.code}-${index}`} dir="auto">
                            {reason.message ?? reason.code}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="student-finance-repair-action__cta">
                    {previewAllowed ? (
                      <button
                        type="button"
                        className={
                          isRegularize ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
                        }
                        onClick={() => setActiveAction(action)}
                      >
                        {isRegularize ? t(tk('regularizeAction')) : t(tk('previewAction'))}
                      </button>
                    ) : action.isBlocked ? (
                      <span className="tiny muted">{t(tk('blockedActionHint'))}</span>
                    ) : insufficientPlans ? null : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="tiny muted">{t(tk('noActions'))}</p>
      )}

      {!diagnostics.canApplyActions ? (
        <p className="tiny muted student-finance-repair-center__readonly">{t(tk('readOnlyNotice'))}</p>
      ) : null}

      <FinanceRepairActionPreviewDrawer
        open={activeAction != null}
        studentId={studentId}
        action={activeAction}
        canApplyActions={diagnostics.canApplyActions}
        currencyName={currencyName}
        onClose={() => setActiveAction(null)}
        onApplied={handleApplied}
      />
    </section>
  );
}
