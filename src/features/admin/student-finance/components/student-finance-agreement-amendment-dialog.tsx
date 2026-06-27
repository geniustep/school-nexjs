'use client';

import { useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import {
  applyAgreementAmendment,
  fetchAgreementAmendmentEffectivePeriods,
  fetchFinancialAgreement,
  previewAgreementAmendment,
} from '../api/finance-admin-api';
import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
import type {
  AgreementAmendmentFormState,
  AgreementAmendmentOperationType,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import { resolveAgreementAmendmentErrorMessage } from '../utils/agreement-amendment-errors';
import {
  buildAgreementAmendmentApplyPayload,
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
  canSubmitAgreementAmendmentReason,
} from '../utils/build-agreement-amendment-payload';
import { normalizeAgreementAmendmentPreview } from '../utils/normalize-agreement-amendment-preview';
import {
  resolveAmendmentAgreementLineOptions,
  resolveAmendmentEffectivePeriodOptions,
} from '../utils/resolve-amendment-form-options';

function defaultForm(): AgreementAmendmentFormState {
  return {
    operationType: 'modify_line',
    effectivePeriodId: '',
    reason: '',
    sourceLineId: '',
    feeTypeId: '',
    amount: '',
  };
}

function InstallmentPreviewList({
  title,
  items,
  currency,
}: {
  title: string;
  items: NormalizedAgreementAmendmentPreview['createdInstallments'];
  currency: string | null;
}) {
  if (!items.length) return null;
  return (
    <div className="student-finance-amendment-preview__installments">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <span dir="auto">{item.label}</span>
            {item.amount != null ? (
              <>
                {' — '}
                <FinanceMoney amount={item.amount} currency={currency ?? undefined} />
              </>
            ) : null}
            {item.state ? <span className="tiny muted"> ({item.state})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudentFinanceAgreementAmendmentDialog({
  open,
  studentId,
  agreement,
  workspaceAllowed,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studentId: number;
  agreement: FinancialAgreement | null;
  workspaceAllowed?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { feeTypes, loading: feeTypesLoading } = useFeeTypeOptions();
  const [form, setForm] = useState(defaultForm);
  const [preview, setPreview] = useState<NormalizedAgreementAmendmentPreview | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [agreementDetails, setAgreementDetails] = useState<FinancialAgreement | null>(agreement);
  const [fetchedPeriods, setFetchedPeriods] = useState<AgreementAmendmentPeriodOption[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState<string | null>(null);

  const agreementId = agreement?.id ?? null;
  const canEdit = workspaceAllowed === true && agreementId != null;

  const lineOptions = useMemo(
    () => resolveAmendmentAgreementLineOptions(agreementDetails ?? agreement),
    [agreement, agreementDetails],
  );

  const periodOptions = useMemo(
    () =>
      resolveAmendmentEffectivePeriodOptions({
        fetchedPeriods,
        previewOpenPeriods: preview?.openPeriods,
      }),
    [fetchedPeriods, preview?.openPeriods],
  );

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm());
    setPreview(null);
    setPreviewReady(false);
    setFormError(null);
    setShowApplyConfirm(false);
    setAgreementDetails(agreement);
    setFetchedPeriods([]);
    setPeriodsError(null);
  }, [open, agreementId, agreement]);

  useEffect(() => {
    if (!open || agreementId == null) return;
    let cancelled = false;
    setPeriodsLoading(true);
    setPeriodsError(null);
    void fetchAgreementAmendmentEffectivePeriods(studentId, agreementId).then((res) => {
      if (cancelled) return;
      setPeriodsLoading(false);
      if (!res.success || !res.data?.length) {
        setFetchedPeriods([]);
        setPeriodsError(
          (!res.success ? res.error?.message : null) ??
            t('admin.student360.financeWorkspace.agreementAmendment.errors.noOpenPeriods'),
        );
        return;
      }
      setFetchedPeriods(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, agreementId, studentId, t]);

  useEffect(() => {
    if (!open || agreementId == null) return;
    let cancelled = false;
    void fetchFinancialAgreement(agreementId).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setAgreementDetails(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, agreementId]);

  function resetAndClose() {
    setForm(defaultForm());
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

  function updateOperationType(operationType: AgreementAmendmentOperationType) {
    setForm((prev) => ({
      ...prev,
      operationType,
      sourceLineId: '',
      feeTypeId: '',
      amount: operationType === 'cancel_line' ? '0' : '',
    }));
    invalidatePreview();
  }

  function handleLineSelection(sourceLineId: string) {
    const selected = lineOptions.find((line) => String(line.id) === sourceLineId);
    setForm((prev) => ({
      ...prev,
      sourceLineId,
      feeTypeId: selected?.feeTypeId != null ? String(selected.feeTypeId) : prev.feeTypeId,
      amount:
        prev.operationType === 'modify_line' && selected?.amount != null
          ? String(selected.amount)
          : prev.operationType === 'cancel_line'
            ? '0'
            : prev.amount,
    }));
    invalidatePreview();
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || agreementId == null) return;

    if (!canSubmitAgreementAmendmentReason(form.reason)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.reasonRequired'));
      return;
    }
    if (!canSubmitAgreementAmendmentForm(form)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
      return;
    }

    setPreviewLoading(true);
    const payload = buildAgreementAmendmentPreviewPayload(agreementId, form);
    const res = await previewAgreementAmendment(studentId, payload);
    setPreviewLoading(false);

    if (!res.success) {
      setFormError(
        resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t),
      );
      return;
    }

    const normalized = normalizeAgreementAmendmentPreview(res.data);
    setPreview(normalized);
    setPreviewReady(true);
    setFormError(null);
  }

  async function handleApplyConfirmed() {
    if (!previewReady || !preview?.allowed || agreementId == null) return;
    if (!canSubmitAgreementAmendmentForm(form)) return;

    setApplyLoading(true);
    const payload = buildAgreementAmendmentApplyPayload(agreementId, form);
    const res = await applyAgreementAmendment(studentId, payload);
    setApplyLoading(false);

    if (!res.success) {
      setFormError(
        resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t),
      );
      setShowApplyConfirm(false);
      return;
    }

    toast.success(t('admin.student360.financeWorkspace.agreementAmendment.success'));
    resetAndClose();
    onSuccess();
  }

  if (!open) return null;

  return (
    <>
      <SetupDrawer
        open={open}
        title={t('admin.student360.financeWorkspace.agreementAmendment.title')}
        subtitle={t('admin.student360.financeWorkspace.agreementAmendment.subtitle')}
        onClose={resetAndClose}
        size="wide"
      >
        <form className="student-finance-amendment-form stack" onSubmit={(e) => void handlePreview(e)}>
          <label>
            <span className="tiny muted">
              {t('admin.student360.financeWorkspace.agreementAmendment.operation.label')}
            </span>
            <select
              className="input"
              value={form.operationType}
              onChange={(e) => updateOperationType(e.target.value as AgreementAmendmentOperationType)}
              disabled={!canEdit}
            >
              <option value="add_line">
                {t('admin.student360.financeWorkspace.agreementAmendment.operation.addLine')}
              </option>
              <option value="cancel_line">
                {t('admin.student360.financeWorkspace.agreementAmendment.operation.cancelLine')}
              </option>
              <option value="modify_line">
                {t('admin.student360.financeWorkspace.agreementAmendment.operation.modifyLine')}
              </option>
            </select>
          </label>

          <label>
            <span className="tiny muted">
              {t('admin.student360.financeWorkspace.agreementAmendment.effectivePeriod')}
            </span>
            <select
              className="input"
              value={form.effectivePeriodId}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, effectivePeriodId: e.target.value }));
                invalidatePreview();
              }}
              disabled={!canEdit || periodsLoading || !periodOptions.length}
            >
              <option value="">{t('common.dash')}</option>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
            {periodsLoading ? (
              <span className="tiny muted">{t('common.loading')}</span>
            ) : periodsError ? (
              <span className="tiny muted">{periodsError}</span>
            ) : !periodOptions.length ? (
              <span className="tiny muted">
                {t('admin.student360.financeWorkspace.agreementAmendment.noPeriodsHint')}
              </span>
            ) : null}
          </label>

          <label>
            <span className="tiny muted">
              {t('admin.student360.financeWorkspace.agreementAmendment.reason')}
            </span>
            <textarea
              className="input"
              rows={3}
              value={form.reason}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, reason: e.target.value }));
                invalidatePreview();
              }}
              disabled={!canEdit}
              required
            />
          </label>

          {form.operationType === 'add_line' ? (
            <>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.agreementAmendment.fields.feeType')}
                </span>
                <select
                  className="input"
                  value={form.feeTypeId}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, feeTypeId: e.target.value }));
                    invalidatePreview();
                  }}
                  disabled={!canEdit || feeTypesLoading}
                >
                  <option value="">{t('common.dash')}</option>
                  {feeTypes.map((feeType) => (
                    <option key={feeType.id} value={feeType.id}>
                      {feeType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.agreementAmendment.fields.amount')}
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, amount: e.target.value }));
                    invalidatePreview();
                  }}
                  disabled={!canEdit}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.agreementAmendment.fields.line')}
                </span>
                <select
                  className="input"
                  value={form.sourceLineId}
                  onChange={(e) => handleLineSelection(e.target.value)}
                  disabled={!canEdit || !lineOptions.length}
                >
                  <option value="">{t('common.dash')}</option>
                  {lineOptions.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.operationType === 'modify_line' ? (
                <label>
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.fields.amount')}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, amount: e.target.value }));
                      invalidatePreview();
                    }}
                    disabled={!canEdit}
                  />
                </label>
              ) : null}
            </>
          )}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="row">
            <button type="submit" className="btn btn--primary" disabled={previewLoading || !canEdit}>
              {previewLoading
                ? t('common.loading')
                : t('admin.student360.financeWorkspace.agreementAmendment.preview')}
            </button>
            {previewReady && preview?.allowed ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={applyLoading}
                onClick={() => setShowApplyConfirm(true)}
              >
                {t('admin.student360.financeWorkspace.agreementAmendment.apply')}
              </button>
            ) : null}
          </div>
        </form>

        {preview ? (
          <section className="student-finance-amendment-preview stack" aria-live="polite">
            <h3>{t('admin.student360.financeWorkspace.agreementAmendment.previewTitle')}</h3>
            <dl className="detail-list compact">
              <div>
                <dt>{t('admin.student360.financeWorkspace.agreementAmendment.allowed')}</dt>
                <dd>
                  {preview.allowed
                    ? t('admin.student360.financeWorkspace.agreementAmendment.allowedYes')
                    : t('admin.student360.financeWorkspace.agreementAmendment.blocked')}
                </dd>
              </div>
              {preview.amountBefore != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.amountBefore')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={preview.amountBefore}
                      currency={preview.currency ?? undefined}
                    />
                  </dd>
                </div>
              ) : null}
              {preview.amountAfter != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.amountAfter')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={preview.amountAfter}
                      currency={preview.currency ?? undefined}
                    />
                  </dd>
                </div>
              ) : null}
              {preview.delta != null ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.delta')}</dt>
                  <dd>
                    <FinanceMoney amount={preview.delta} currency={preview.currency ?? undefined} />
                  </dd>
                </div>
              ) : null}
              {preview.affectedPeriods.length ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.affectedPeriods')}</dt>
                  <dd>{preview.affectedPeriods.join(', ')}</dd>
                </div>
              ) : null}
              {preview.lockedPeriods.length ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.lockedPeriods')}</dt>
                  <dd>{preview.lockedPeriods.join(', ')}</dd>
                </div>
              ) : null}
            </dl>

            {preview.lockedPeriods.length ? (
              <p className="student-finance-amendment-preview__locked-warning" role="note">
                {t('admin.student360.financeWorkspace.agreementAmendment.lockedPeriodsWarning')}
              </p>
            ) : null}

            {preview.warnings.length ? (
              <div>
                <h4>{t('admin.student360.financeWorkspace.agreementAmendment.warnings')}</h4>
                <ul className="student-finance-amendment-preview__warnings">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>
                      {resolveAgreementAmendmentErrorMessage(warning, undefined, t)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.blockingReasons.length ? (
              <div>
                <h4>{t('admin.student360.financeWorkspace.agreementAmendment.blockingReasons')}</h4>
                <ul className="student-finance-amendment-preview__blockers">
                  {preview.blockingReasons.map((reason) => (
                    <li key={reason}>
                      {resolveAgreementAmendmentErrorMessage(reason, undefined, t)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <InstallmentPreviewList
              title={t('admin.student360.financeWorkspace.agreementAmendment.createdInstallments')}
              items={preview.createdInstallments}
              currency={preview.currency}
            />
            <InstallmentPreviewList
              title={t('admin.student360.financeWorkspace.agreementAmendment.updatedInstallments')}
              items={preview.updatedInstallments}
              currency={preview.currency}
            />
            <InstallmentPreviewList
              title={t('admin.student360.financeWorkspace.agreementAmendment.cancelledInstallments')}
              items={preview.cancelledInstallments}
              currency={preview.currency}
            />
          </section>
        ) : null}
      </SetupDrawer>

      <ConfirmationDialog
        open={showApplyConfirm}
        title={t('admin.student360.financeWorkspace.agreementAmendment.applyConfirm.title')}
        body={t('admin.student360.financeWorkspace.agreementAmendment.applyConfirm.body')}
        confirmLabel={t('admin.student360.financeWorkspace.agreementAmendment.apply')}
        cancelLabel={t('common.cancel')}
        loading={applyLoading}
        onConfirm={() => void handleApplyConfirmed()}
        onClose={() => setShowApplyConfirm(false)}
      />
    </>
  );
}
