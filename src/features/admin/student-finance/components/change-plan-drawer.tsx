'use client';

import { useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useConfirmedFeePlanOptions } from '@/features/admin/finance/use-finance-lookups';
import { filterFeePlansForAcademicYear } from '@/features/admin/finance/fee-plan-assign-utils';
import { useT } from '@/features/i18n/locale-context';
import type { ChangePlanMode } from '@/types/student-finance-change-plan';
import type { NormalizedChangePlanPreview } from '@/types/student-finance-change-plan';
import {
  applyStudentChangePlan,
  previewStudentChangePlan,
} from '../api/finance-admin-api';
import {
  buildReplaceIfUnpaidApplyPayload,
  buildReplaceIfUnpaidPreviewPayload,
  type ReplaceIfUnpaidFormState,
} from '../utils/build-change-plan-payload';
import { resolveChangePlanErrorMessage } from '../utils/change-plan-errors';
import { normalizeChangePlanPreview } from '../utils/normalize-change-plan-preview';
import { resolveAgreementStateLabel } from '../utils/reference-labels';
import type { ChangePlanEligibility } from '../utils/resolve-change-plan-eligibility';

function defaultReplaceForm(): ReplaceIfUnpaidFormState {
  return {
    newFeePlanId: '',
    activationMode: 'activate',
    changeReason: 'plan_correction',
    confirmReplace: false,
  };
}

function isRetiredLegacyMode(mode: ChangePlanMode): boolean {
  return mode === 'social_discount_on_future_installments';
}

export function ChangePlanDrawer({
  open,
  mode,
  studentId,
  academicYearId,
  levelId,
  eligibility,
  paymentsExistHint = false,
  onClose,
  onNavigateToAgreements,
  onSuccess,
}: {
  open: boolean;
  mode: ChangePlanMode;
  studentId: number;
  academicYearId: string;
  levelId?: number | null;
  eligibility: ChangePlanEligibility;
  /** Display-only hint from workspace totals; Backend preview remains authoritative. */
  paymentsExistHint?: boolean;
  onClose: () => void;
  onNavigateToAgreements?: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const retiredLegacyMode = isRetiredLegacyMode(mode);
  const [replaceForm, setReplaceForm] = useState(defaultReplaceForm);
  const [preview, setPreview] = useState<NormalizedChangePlanPreview | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const { plans, loading: plansLoading } = useConfirmedFeePlanOptions(
    academicYearId || null,
    levelId ?? null,
  );
  const filteredPlans = useMemo(
    () => (academicYearId ? filterFeePlansForAcademicYear(plans, Number(academicYearId)) : []),
    [plans, academicYearId],
  );

  const title = retiredLegacyMode
    ? t('admin.student360.financeWorkspace.changePlan.retired.title')
    : t('admin.student360.financeWorkspace.changePlan.replace.title');

  const subtitle = retiredLegacyMode
    ? t('admin.student360.financeWorkspace.changePlan.retired.description')
    : t('admin.student360.financeWorkspace.changePlan.replace.description');

  const canEdit = eligibility.hasActiveAgreementInUi;
  const agreementStateLabel = eligibility.agreementState
    ? resolveAgreementStateLabel(t, eligibility.agreementState)
    : null;

  function resetAndClose() {
    setReplaceForm(defaultReplaceForm());
    setPreview(null);
    setPreviewReady(false);
    setFormError(null);
    setShowApplyConfirm(false);
    onClose();
  }

  function invalidatePreview() {
    setPreview(null);
    setPreviewReady(false);
  }

  function validateForm(): boolean {
    if (!replaceForm.newFeePlanId) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.replace.errors.feePlanRequired'));
      return false;
    }
    if (!replaceForm.changeReason.trim()) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.replace.errors.reasonRequired'));
      return false;
    }
    setFormError(null);
    return true;
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (retiredLegacyMode) return;
    if (!canEdit) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.eligibility.noActiveAgreement'));
      return;
    }
    if (!validateForm()) return;
    setPreviewLoading(true);
    const payload = buildReplaceIfUnpaidPreviewPayload(replaceForm);
    const res = await previewStudentChangePlan(studentId, payload, {
      academic_year_id: Number(academicYearId),
    });
    setPreviewLoading(false);
    if (!res.success) {
      if (res.error.code === 'legacy_special_adjustment_retired') {
        setFormError(
          resolveChangePlanErrorMessage(res.error.code, res.error.message, t),
        );
        setPreview({
          canApply: false,
          blockingReasons: ['legacy_special_adjustment_retired'],
          warnings: [],
          deprecated: true,
          replacementWorkflow: 'agreement_amendments',
          replacementOperation: 'modify_line',
          preservedPeriods: [],
          affectedPeriods: [],
        });
        setPreviewReady(true);
        return;
      }
      if (res.error.code === 'no_active_agreement' && eligibility.hasActiveAgreementInUi) {
        setFormError(
          t('admin.student360.financeWorkspace.changePlan.eligibility.activeAgreementServiceMismatch'),
        );
      } else {
        setFormError(resolveChangePlanErrorMessage(res.error.code, res.error.message, t));
      }
      return;
    }
    const normalized = normalizeChangePlanPreview(res.data);
    setPreview(normalized);
    setPreviewReady(true);
    if (normalized.deprecated) {
      setFormError(
        resolveChangePlanErrorMessage('legacy_special_adjustment_retired', undefined, t),
      );
    } else if (!normalized.canApply && normalized.blockingReasons.length === 0) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.errors.cannotApply'));
    } else {
      setFormError(null);
    }
  }

  async function handleApplyConfirmed() {
    if (retiredLegacyMode || preview?.deprecated) return;
    if (!previewReady || !validateForm()) return;
    setApplyLoading(true);
    const payload = buildReplaceIfUnpaidApplyPayload(replaceForm);
    const res = await applyStudentChangePlan(studentId, payload, {
      academic_year_id: Number(academicYearId),
    });
    setApplyLoading(false);
    if (!res.success) {
      if (res.error.code === 'legacy_special_adjustment_retired') {
        setFormError(
          resolveChangePlanErrorMessage(res.error.code, res.error.message, t),
        );
        setShowApplyConfirm(false);
        return;
      }
      if (res.error.code === 'no_active_agreement' && eligibility.hasActiveAgreementInUi) {
        setFormError(
          t('admin.student360.financeWorkspace.changePlan.eligibility.activeAgreementServiceMismatch'),
        );
      } else {
        setFormError(resolveChangePlanErrorMessage(res.error.code, res.error.message, t));
      }
      setShowApplyConfirm(false);
      return;
    }
    toast.success(t('admin.student360.financeWorkspace.changePlan.applySuccess'));
    resetAndClose();
    onSuccess();
  }

  function handleGoToAgreements() {
    resetAndClose();
    onNavigateToAgreements?.();
  }

  if (!open) return null;

  if (retiredLegacyMode) {
    return (
      <SetupDrawer open={open} title={title} subtitle={subtitle} onClose={resetAndClose} size="wide">
        <section
          className="student-finance-change-plan-retired"
          role="status"
          aria-live="polite"
        >
          <p className="student-finance-change-plan-retired__title">
            {t('admin.student360.financeWorkspace.changePlan.retired.title')}
          </p>
          <p>{t('admin.student360.financeWorkspace.changePlan.retired.description')}</p>
          <p className="tiny muted">
            {t('admin.student360.financeWorkspace.changePlan.retired.replacementHint')}
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={handleGoToAgreements}>
              {t('admin.student360.financeWorkspace.changePlan.retired.manageAgreementCta')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={resetAndClose}>
              {t('common.cancel')}
            </button>
          </div>
        </section>
      </SetupDrawer>
    );
  }

  const showRetiredFromPreview = preview?.deprecated === true;
  const canShowApply = previewReady && preview?.canApply === true && !showRetiredFromPreview;

  return (
    <>
      <SetupDrawer open={open} title={title} subtitle={subtitle} onClose={resetAndClose} size="wide">
        <section
          className={`student-finance-change-plan-eligibility${canEdit ? ' student-finance-change-plan-eligibility--eligible' : ' student-finance-change-plan-eligibility--ineligible'}`}
          aria-live="polite"
        >
          <p className="student-finance-change-plan-eligibility__title">
            {t('admin.student360.financeWorkspace.changePlan.eligibility.title')}
          </p>
          <p className="student-finance-change-plan-eligibility__status">
            {canEdit
              ? t('admin.student360.financeWorkspace.changePlan.eligibility.eligible')
              : t('admin.student360.financeWorkspace.changePlan.eligibility.notEligibleTitle')}
          </p>
          <p className="student-finance-change-plan-eligibility__detail">
            {canEdit
              ? t('admin.student360.financeWorkspace.changePlan.eligibility.eligibleDetail')
              : t('admin.student360.financeWorkspace.changePlan.eligibility.noActiveAgreement')}
          </p>
          {canEdit ? (
            <p className="student-finance-change-plan-eligibility__meta tiny muted">
              {t('admin.student360.financeWorkspace.changePlan.replace.unpaidOnlyHint')}
            </p>
          ) : null}
          {canEdit && paymentsExistHint ? (
            <p className="student-finance-change-plan-eligibility__meta tiny muted" role="note">
              {t('admin.student360.financeWorkspace.changePlan.replace.paymentsExistHint')}
            </p>
          ) : null}
          {!canEdit && agreementStateLabel ? (
            <p className="student-finance-change-plan-eligibility__meta tiny muted">
              {t('admin.student360.financeWorkspace.changePlan.eligibility.currentAgreementState', {
                state: agreementStateLabel,
              })}
            </p>
          ) : null}
        </section>

        {showRetiredFromPreview ? (
          <section className="student-finance-change-plan-retired" role="status" aria-live="polite">
            <p>{resolveChangePlanErrorMessage('legacy_special_adjustment_retired', undefined, t)}</p>
            <p className="tiny muted">
              {t('admin.student360.financeWorkspace.changePlan.retired.replacementHint')}
            </p>
            <button type="button" className="btn btn--primary" onClick={handleGoToAgreements}>
              {t('admin.student360.financeWorkspace.changePlan.retired.manageAgreementCta')}
            </button>
          </section>
        ) : (
          <form className="student-finance-change-plan-form stack" onSubmit={handlePreview}>
            <p className="student-finance-change-plan-hint" role="note">
              {t('admin.student360.financeWorkspace.changePlan.replace.unpaidOnlyHint')}
            </p>
            <label>
              <span className="tiny muted">
                {t('admin.student360.financeWorkspace.changePlan.replace.fields.feePlan')}
              </span>
              <select
                className="input"
                value={replaceForm.newFeePlanId}
                onChange={(e) => {
                  setReplaceForm((prev) => ({ ...prev, newFeePlanId: e.target.value }));
                  invalidatePreview();
                }}
                disabled={plansLoading || !canEdit}
              >
                <option value="">{t('common.dash')}</option>
                {filteredPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="tiny muted">
                {t('admin.student360.financeWorkspace.changePlan.replace.fields.reason')}
              </span>
              <input
                className="input"
                value={replaceForm.changeReason}
                onChange={(e) => {
                  setReplaceForm((prev) => ({ ...prev, changeReason: e.target.value }));
                  invalidatePreview();
                }}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span className="tiny muted">
                {t('admin.student360.financeWorkspace.changePlan.replace.fields.activationMode')}
              </span>
              <select
                className="input"
                value={replaceForm.activationMode}
                onChange={(e) => {
                  setReplaceForm((prev) => ({
                    ...prev,
                    activationMode: e.target.value as ReplaceIfUnpaidFormState['activationMode'],
                  }));
                  invalidatePreview();
                }}
                disabled={!canEdit}
              >
                <option value="activate">
                  {t('admin.student360.financeWorkspace.changePlan.replace.activation.activate')}
                </option>
                <option value="draft">
                  {t('admin.student360.financeWorkspace.changePlan.replace.activation.draft')}
                </option>
              </select>
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={replaceForm.confirmReplace}
                onChange={(e) => {
                  setReplaceForm((prev) => ({ ...prev, confirmReplace: e.target.checked }));
                  invalidatePreview();
                }}
                disabled={!canEdit}
              />
              <span>{t('admin.student360.financeWorkspace.changePlan.replace.fields.confirmReplace')}</span>
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <div className="row">
              <button type="submit" className="btn btn--primary" disabled={previewLoading || !canEdit}>
                {previewLoading
                  ? t('common.loading')
                  : t('admin.student360.financeWorkspace.changePlan.previewAction')}
              </button>
              {canShowApply ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={applyLoading}
                  onClick={() => {
                    if (!replaceForm.confirmReplace) {
                      setFormError(
                        t('admin.student360.financeWorkspace.changePlan.replace.errors.confirmRequired'),
                      );
                      return;
                    }
                    setShowApplyConfirm(true);
                  }}
                >
                  {t('admin.student360.financeWorkspace.changePlan.applyAction')}
                </button>
              ) : null}
            </div>
          </form>
        )}

        {preview && !showRetiredFromPreview ? (
          <section className="student-finance-change-plan-preview stack">
            <h3>{t('admin.student360.financeWorkspace.changePlan.previewTitle')}</h3>
            <dl className="detail-list compact">
              {preview.currentAgreementLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.currentAgreement')}</dt>
                  <dd>{preview.currentAgreementLabel}</dd>
                </div>
              ) : null}
              {preview.currentFeePlanLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.currentFeePlan')}</dt>
                  <dd>{preview.currentFeePlanLabel}</dd>
                </div>
              ) : null}
              {preview.newFeePlanLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.newFeePlan')}</dt>
                  <dd>{preview.newFeePlanLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('admin.student360.financeWorkspace.changePlan.preview.canApply')}</dt>
                <dd>{preview.canApply ? t('common.yes') : t('common.no')}</dd>
              </div>
              {preview.willAmendCurrent != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.willAmendCurrent')}</dt>
                  <dd>{preview.willAmendCurrent ? t('common.yes') : t('common.no')}</dd>
                </div>
              ) : null}
              {preview.willCreateNew != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.willCreateNew')}</dt>
                  <dd>{preview.willCreateNew ? t('common.yes') : t('common.no')}</dd>
                </div>
              ) : null}
              {preview.newAgreementStateLabel ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.newAgreementState')}</dt>
                  <dd>{preview.newAgreementStateLabel}</dd>
                </div>
              ) : null}
              {preview.preservedPeriods.length ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.preservedPeriods')}</dt>
                  <dd>{preview.preservedPeriods.join(', ')}</dd>
                </div>
              ) : null}
              {preview.affectedPeriods.length ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.affectedPeriods')}</dt>
                  <dd>{preview.affectedPeriods.join(', ')}</dd>
                </div>
              ) : null}
              {preview.oldAmount != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.oldAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={preview.oldAmount} currency={preview.currency ?? undefined} />
                  </dd>
                </div>
              ) : null}
              {preview.newAmount != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.newAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={preview.newAmount} currency={preview.currency ?? undefined} />
                  </dd>
                </div>
              ) : null}
              {preview.discountAmount != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.changePlan.preview.discountAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={preview.discountAmount} currency={preview.currency ?? undefined} />
                  </dd>
                </div>
              ) : null}
            </dl>
            {preview.blockingReasons.length ? (
              <ul className="student-finance-change-plan-blockers">
                {preview.blockingReasons.map((reason) => (
                  <li key={reason}>{resolveChangePlanErrorMessage(reason, undefined, t)}</li>
                ))}
              </ul>
            ) : null}
            {preview.blockingReasons.includes('plan_change_blocked_by_payments') ? (
              <div className="student-finance-change-plan-retired" role="note">
                <p className="tiny muted">
                  {t('admin.student360.financeWorkspace.changePlan.retired.replacementHint')}
                </p>
                <button type="button" className="btn btn--ghost" onClick={handleGoToAgreements}>
                  {t('admin.student360.financeWorkspace.changePlan.retired.manageAgreementCta')}
                </button>
              </div>
            ) : null}
            {preview.warnings.length ? (
              <ul className="student-finance-change-plan-warnings">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{resolveChangePlanErrorMessage(warning, undefined, t)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </SetupDrawer>

      <ConfirmationDialog
        open={showApplyConfirm}
        title={t('admin.student360.financeWorkspace.changePlan.applyConfirm.title')}
        body={t('admin.student360.financeWorkspace.changePlan.applyConfirm.body')}
        confirmLabel={t('admin.student360.financeWorkspace.changePlan.applyAction')}
        cancelLabel={t('common.cancel')}
        loading={applyLoading}
        onConfirm={handleApplyConfirmed}
        onClose={() => setShowApplyConfirm(false)}
      />
    </>
  );
}
