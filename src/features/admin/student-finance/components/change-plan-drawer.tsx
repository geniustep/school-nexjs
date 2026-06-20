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
  buildChangePlanPayload,
  monthPeriodsFromRange,
  type ReplaceIfUnpaidFormState,
  type SocialDiscountFormState,
} from '../utils/build-change-plan-payload';
import { resolveChangePlanErrorMessage } from '../utils/change-plan-errors';
import { normalizeChangePlanPreview } from '../utils/normalize-change-plan-preview';
import { resolveAgreementStateLabel } from '../utils/reference-labels';
import type { ChangePlanEligibility } from '../utils/resolve-change-plan-eligibility';

const SOCIAL_FEE_TYPES = ['tuition', 'transport'] as const;

function defaultReplaceForm(): ReplaceIfUnpaidFormState {
  return {
    newFeePlanId: '',
    activationMode: 'activate',
    changeReason: 'plan_correction',
    confirmReplace: false,
  };
}

function defaultSocialForm(): SocialDiscountFormState {
  return {
    effectiveDate: '',
    feeTypeCode: 'tuition',
    discountType: 'percent',
    discountValue: '',
    reasonNote: '',
    affectedPeriods: [],
    confirmFinancialImpact: false,
  };
}

export function ChangePlanDrawer({
  open,
  mode,
  studentId,
  academicYearId,
  levelId,
  eligibility,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: ChangePlanMode;
  studentId: number;
  academicYearId: string;
  levelId?: number | null;
  eligibility: ChangePlanEligibility;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [replaceForm, setReplaceForm] = useState(defaultReplaceForm);
  const [socialForm, setSocialForm] = useState(defaultSocialForm);
  const [periodEndMonth, setPeriodEndMonth] = useState('');
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

  const title =
    mode === 'replace_if_unpaid'
      ? t('admin.student360.financeWorkspace.changePlan.replace.title')
      : t('admin.student360.financeWorkspace.changePlan.special.title');

  const subtitle =
    mode === 'replace_if_unpaid'
      ? t('admin.student360.financeWorkspace.changePlan.replace.description')
      : t('admin.student360.financeWorkspace.changePlan.special.description');

  const canEdit = eligibility.hasActiveAgreementInUi;
  const agreementStateLabel = eligibility.agreementState
    ? resolveAgreementStateLabel(t, eligibility.agreementState)
    : null;

  function resetAndClose() {
    setReplaceForm(defaultReplaceForm());
    setSocialForm(defaultSocialForm());
    setPeriodEndMonth('');
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

  function resolveSocialFormForSubmit(): SocialDiscountFormState {
    const startMonth = socialForm.effectiveDate.slice(0, 7);
    const periods =
      socialForm.affectedPeriods.length > 0
        ? socialForm.affectedPeriods
        : periodEndMonth
          ? monthPeriodsFromRange(startMonth, periodEndMonth)
          : [];
    if (periods.length > 0 && socialForm.affectedPeriods.length === 0) {
      return { ...socialForm, affectedPeriods: periods };
    }
    return socialForm;
  }

  function validateForm(): boolean {
    if (mode === 'replace_if_unpaid') {
      if (!replaceForm.newFeePlanId) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.replace.errors.feePlanRequired'));
        return false;
      }
      if (!replaceForm.changeReason.trim()) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.replace.errors.reasonRequired'));
        return false;
      }
    } else {
      if (!socialForm.effectiveDate) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.special.errors.effectiveDateRequired'));
        return false;
      }
      if (!socialForm.reasonNote.trim()) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.special.errors.reasonNoteRequired'));
        return false;
      }
      if (!socialForm.discountValue || Number(socialForm.discountValue) <= 0) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.special.errors.discountRequired'));
        return false;
      }
      const startMonth = socialForm.effectiveDate.slice(0, 7);
      const periods =
        socialForm.affectedPeriods.length > 0
          ? socialForm.affectedPeriods
          : periodEndMonth
            ? monthPeriodsFromRange(startMonth, periodEndMonth)
            : [];
      if (!periods.length) {
        setFormError(t('admin.student360.financeWorkspace.changePlan.special.errors.periodsRequired'));
        return false;
      }
      if (socialForm.affectedPeriods.length === 0) {
        setSocialForm((prev) => ({ ...prev, affectedPeriods: periods }));
      }
    }
    setFormError(null);
    return true;
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.eligibility.noActiveAgreement'));
      return;
    }
    if (!validateForm()) return;
    setPreviewLoading(true);
    const formState =
      mode === 'replace_if_unpaid' ? replaceForm : resolveSocialFormForSubmit();
    const payload = buildChangePlanPayload(mode, formState, 'preview');
    const res = await previewStudentChangePlan(studentId, payload, {
      academic_year_id: Number(academicYearId),
    });
    setPreviewLoading(false);
    if (!res.success) {
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
    if (!normalized.canApply && normalized.blockingReasons.length === 0) {
      setFormError(t('admin.student360.financeWorkspace.changePlan.errors.cannotApply'));
    } else {
      setFormError(null);
    }
  }

  async function handleApplyConfirmed() {
    if (!previewReady || !validateForm()) return;
    setApplyLoading(true);
    const formState =
      mode === 'replace_if_unpaid' ? replaceForm : resolveSocialFormForSubmit();
    const payload = buildChangePlanPayload(mode, formState, 'apply');
    const res = await applyStudentChangePlan(studentId, payload, {
      academic_year_id: Number(academicYearId),
    });
    setApplyLoading(false);
    if (!res.success) {
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

  if (!open) return null;

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
          {!canEdit && agreementStateLabel ? (
            <p className="student-finance-change-plan-eligibility__meta tiny muted">
              {t('admin.student360.financeWorkspace.changePlan.eligibility.currentAgreementState', {
                state: agreementStateLabel,
              })}
            </p>
          ) : null}
        </section>

        <form className="student-finance-change-plan-form stack" onSubmit={handlePreview}>
          <p className="student-finance-change-plan-hint" role="note">
            {mode === 'replace_if_unpaid'
              ? t('admin.student360.financeWorkspace.changePlan.replace.paymentsExistHint')
              : t('admin.student360.financeWorkspace.changePlan.special.preservedWarning')}
          </p>
          {mode === 'replace_if_unpaid' ? (
            <>
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
            </>
          ) : (
            <>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.changePlan.special.fields.effectiveDate')}
                </span>
                <input
                  className="input"
                  type="date"
                  value={socialForm.effectiveDate}
                  onChange={(e) => {
                    setSocialForm((prev) => ({ ...prev, effectiveDate: e.target.value }));
                    invalidatePreview();
                  }}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.changePlan.special.fields.feeType')}
                </span>
                <select
                  className="input"
                  value={socialForm.feeTypeCode}
                  onChange={(e) => {
                    setSocialForm((prev) => ({ ...prev, feeTypeCode: e.target.value }));
                    invalidatePreview();
                  }}
                  disabled={!canEdit}
                >
                  {SOCIAL_FEE_TYPES.map((code) => (
                    <option key={code} value={code}>
                      {t(`admin.student360.financeWorkspace.changePlan.special.feeTypes.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row">
                <label>
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.changePlan.special.fields.discountType')}
                  </span>
                  <select
                    className="input"
                    value={socialForm.discountType}
                    onChange={(e) => {
                      setSocialForm((prev) => ({
                        ...prev,
                        discountType: e.target.value as SocialDiscountFormState['discountType'],
                      }));
                      invalidatePreview();
                    }}
                    disabled={!canEdit}
                  >
                    <option value="percent">
                      {t('admin.student360.financeWorkspace.changePlan.special.discountTypes.percent')}
                    </option>
                    <option value="amount">
                      {t('admin.student360.financeWorkspace.changePlan.special.discountTypes.amount')}
                    </option>
                  </select>
                </label>
                <label>
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.changePlan.special.fields.discountValue')}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={socialForm.discountValue}
                    onChange={(e) => {
                      setSocialForm((prev) => ({ ...prev, discountValue: e.target.value }));
                      invalidatePreview();
                    }}
                    disabled={!canEdit}
                  />
                </label>
              </div>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.changePlan.special.fields.periodEnd')}
                </span>
                <input
                  className="input"
                  type="month"
                  value={periodEndMonth}
                  onChange={(e) => {
                    setPeriodEndMonth(e.target.value);
                    invalidatePreview();
                  }}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.changePlan.special.fields.reasonNote')}
                </span>
                <textarea
                  className="input"
                  rows={3}
                  value={socialForm.reasonNote}
                  onChange={(e) => {
                    setSocialForm((prev) => ({ ...prev, reasonNote: e.target.value }));
                    invalidatePreview();
                  }}
                  disabled={!canEdit}
                />
              </label>
              <p className="tiny muted">
                {t('admin.student360.financeWorkspace.changePlan.special.preservedWarning')}
              </p>
            </>
          )}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="row">
            <button type="submit" className="btn btn--primary" disabled={previewLoading || !canEdit}>
              {previewLoading
                ? t('common.loading')
                : t('admin.student360.financeWorkspace.changePlan.previewAction')}
            </button>
            {previewReady && preview?.canApply ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={applyLoading}
                onClick={() => {
                  if (mode === 'replace_if_unpaid' && !replaceForm.confirmReplace) {
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

        {preview ? (
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
                <dd>
                  {preview.canApply
                    ? t('common.yes')
                    : t('common.no')}
                </dd>
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
            {preview.warnings.length ? (
              <ul className="student-finance-change-plan-warnings">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{resolveChangePlanErrorMessage(warning, undefined, t)}</li>
                ))}
              </ul>
            ) : null}
            {mode === 'social_discount_on_future_installments' ? (
              <p className="tiny muted">
                {t('admin.student360.financeWorkspace.changePlan.special.noPastChangesWarning')}
              </p>
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
