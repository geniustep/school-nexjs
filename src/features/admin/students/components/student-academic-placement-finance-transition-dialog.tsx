'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { NormalizedAcademicPlacementFinancePreview } from '@/types/student-finance-change-plan';

function serviceLabel(code: string, t: (key: string, params?: Record<string, unknown>) => string): string {
  const normalized = code.trim().toUpperCase();
  const key = `admin.student360.editPage.academicPlacement.financeTransition.services.${normalized}`;
  const translated = t(key);
  return translated === key ? code : translated;
}

function AmountRow({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd><FinanceMoney amount={value} /></dd>
    </div>
  );
}

export function StudentAcademicPlacementFinanceTransitionDialog({
  open,
  preview,
  currentLevelLabel,
  targetLevelLabel,
  willUnassign,
  canConfirm,
  applying,
  staleRefreshed,
  errorKey,
  onConfirm,
  onClose,
}: {
  open: boolean;
  preview: NormalizedAcademicPlacementFinancePreview | null;
  currentLevelLabel: string;
  targetLevelLabel: string;
  willUnassign: boolean;
  canConfirm: boolean;
  applying: boolean;
  staleRefreshed: boolean;
  errorKey: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useT();
  if (!open || !preview) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.editPage.academicPlacement.financeTransition.title')}
      subtitle={t('admin.student360.editPage.academicPlacement.financeTransition.description')}
      onClose={onClose}
      size="wide"
    >
      <div className="stack">
        {staleRefreshed ? (
          <InfoBanner
            tone="amber"
            title={t('admin.student360.editPage.academicPlacement.financeTransition.staleTitle')}
            description={t('admin.student360.editPage.academicPlacement.financeTransition.staleDescription')}
          />
        ) : null}

        {willUnassign ? (
          <InfoBanner
            tone="amber"
            title={t('admin.student360.editPage.academicPlacement.classWarningTitle')}
            description={t('admin.student360.editPage.academicPlacement.classWarning')}
          />
        ) : null}

        <section className="student-finance-change-plan-preview stack">
          <h3>{t('admin.student360.editPage.academicPlacement.financeTransition.academicTitle')}</h3>
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.editPage.academicPlacement.financeTransition.currentLevel')}</dt>
              <dd>{currentLevelLabel || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.editPage.academicPlacement.financeTransition.targetLevel')}</dt>
              <dd>{targetLevelLabel || t('common.dash')}</dd>
            </div>
          </dl>
        </section>

        <section className="student-finance-change-plan-preview stack">
          <h3>{t('admin.student360.editPage.academicPlacement.financeTransition.financeTitle')}</h3>
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.editPage.academicPlacement.financeTransition.targetPlan')}</dt>
              <dd>{t('admin.student360.editPage.academicPlacement.financeTransition.targetPlanResolved')}</dd>
            </div>
            {preview.effectivePeriodKey ? (
              <div>
                <dt>{t('admin.student360.editPage.academicPlacement.financeTransition.effectivePeriod')}</dt>
                <dd>{preview.effectivePeriodKey}</dd>
              </div>
            ) : null}
            <AmountRow
              label={t('admin.student360.editPage.academicPlacement.financeTransition.paidPreserved')}
              value={preview.currentAgreement.paidTotal}
            />
          </dl>
        </section>

        {preview.alreadySatisfiedOneTime.length ? (
          <section className="student-finance-change-plan-preview stack">
            <h3>{t('admin.student360.editPage.academicPlacement.financeTransition.alreadySatisfiedTitle')}</h3>
            <ul>
              {preview.alreadySatisfiedOneTime.map((code) => (
                <li key={code}>
                  {t('admin.student360.editPage.academicPlacement.financeTransition.alreadySatisfiedItem', {
                    service: serviceLabel(code, t),
                  })}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {preview.preservedOldOnlyServices.length ? (
          <section className="student-finance-change-plan-preview stack">
            <h3>{t('admin.student360.editPage.academicPlacement.financeTransition.preservedServicesTitle')}</h3>
            <ul>
              {preview.preservedOldOnlyServices.map((code) => (
                <li key={code}>
                  {t('admin.student360.editPage.academicPlacement.financeTransition.preservedServiceItem', {
                    service: serviceLabel(code, t),
                  })}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {preview.feeSupersessions.length ? (
          <section className="student-finance-change-plan-preview stack">
            <h3>{t('admin.student360.editPage.academicPlacement.financeTransition.futureTitle')}</h3>
            {preview.feeSupersessions.map((fee, index) => {
              const code = fee.feeTypeCode || fee.serviceCode || `#${index + 1}`;
              return (
                <article key={fee.feeId ?? `${code}-${index}`} className="student-finance-change-plan-preview">
                  <p><strong>{serviceLabel(code, t)}</strong></p>
                  <dl className="detail-list compact">
                    <AmountRow
                      label={t('admin.student360.editPage.academicPlacement.financeTransition.lockedAmount')}
                      value={fee.lockedObligationTotal}
                    />
                    <AmountRow
                      label={t('admin.student360.editPage.academicPlacement.financeTransition.replaceableAmount')}
                      value={fee.replaceableObligationTotal}
                    />
                    <AmountRow
                      label={t('admin.student360.editPage.academicPlacement.financeTransition.targetFutureBase')}
                      value={fee.targetFutureBase}
                    />
                    <AmountRow
                      label={t('admin.student360.editPage.academicPlacement.financeTransition.residualCustomization')}
                      value={fee.residualCustomization}
                    />
                    <AmountRow
                      label={t('admin.student360.editPage.academicPlacement.financeTransition.targetFutureNet')}
                      value={fee.targetFutureNet}
                    />
                  </dl>
                </article>
              );
            })}
          </section>
        ) : null}

        <InfoBanner
          title={t('admin.student360.editPage.academicPlacement.financeTransition.historyPreservedTitle')}
          description={t('admin.student360.editPage.academicPlacement.financeTransition.historyPreservedDescription')}
        />

        {preview.blockingReasons.length ? (
          <InfoBanner
            tone="amber"
            title={t('admin.student360.editPage.academicPlacement.financeTransition.blockedTitle')}
            description={t('admin.student360.editPage.academicPlacement.financeTransition.blockedDescription')}
          />
        ) : null}

        {!canConfirm ? (
          <InfoBanner
            tone="amber"
            title={t('admin.student360.editPage.academicPlacement.financeTransition.permissionTitle')}
            description={t('admin.student360.editPage.academicPlacement.financeTransition.permissionDescription')}
          />
        ) : null}

        {errorKey ? <p className="form-error" role="alert">{t(errorKey)}</p> : null}

        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={
              applying ||
              !canConfirm ||
              !preview.canApply ||
              !preview.previewToken ||
              preview.blockingReasons.length > 0
            }
            onClick={onConfirm}
          >
            {applying
              ? t('common.saving')
              : t('admin.student360.editPage.academicPlacement.financeTransition.confirmAction')}
          </button>
          <button type="button" className="btn btn--ghost" disabled={applying} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </SetupDrawer>
  );
}
