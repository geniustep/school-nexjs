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
  AgreementAmendmentPath,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import { resolveAgreementAmendmentErrorMessage, agreementAmendmentReasonMessageKey } from '../utils/agreement-amendment-errors';
import {
  isLineSelectableForAmendmentOperation,
  resolveAvailableAmendmentPaths,
  resolveDefaultAmendmentPath,
} from '../utils/agreement-amendment-path';
import { resolveAgreementLineOperationBlockReasonCode } from '../utils/agreement-amendment-line-eligibility';
import { formatAmendmentEffectivePeriodLabel } from '../utils/agreement-amendment-period-labels';
import {
  hasAgreementAmendmentPricingContract,
  isBlockedByOneTimeLineNotPeriodAmendable,
  resolveAgreementAmendmentPricingContractLabelMode,
  shouldShowAgreementAmendmentAllowedStatus,
  shouldShowAgreementAmendmentBlockingReasons,
  shouldShowAgreementAmendmentLegacyAmounts,
} from '../utils/agreement-amendment-pricing-contract';
import {
  resolveAgreementAmendmentBlockingMessage,
  resolveAgreementAmendmentWarningMessage,
} from '../utils/resolve-agreement-amendment-warning';
import {
  buildAgreementAmendmentApplyPayload,
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
  canSubmitAgreementAmendmentReason,
  usesPeriodRangeForForm,
} from '../utils/build-agreement-amendment-payload';
import { prepareAgreementAmendmentPayload } from '../utils/prepare-agreement-amendment-payload';
import { normalizeAgreementAmendmentPreview } from '../utils/normalize-agreement-amendment-preview';
import {
  resolveAmendmentAgreementLineOptions,
  resolveAmendmentEffectivePeriodOptions,
  type AgreementAmendmentLineOption,
} from '../utils/resolve-amendment-form-options';
import {
  readAmbiguousAgreementLineCandidates,
  isAmbiguousAgreementLineTargetError,
} from '../utils/resolve-agreement-amendment-ambiguous-target';
import type { AgreementAmendmentAmbiguousLineCandidate } from '../types/agreement-amendment';
import { AgreementAmendmentPricingContractPreview } from './agreement-amendment-pricing-contract-preview';
import { AgreementAmendmentAmountAdjustmentPanel } from './agreement-amendment-amount-adjustment-panel';
import { AgreementAmendmentLinePicker } from './agreement-amendment-line-picker';
import { AgreementAmendmentRangeRail } from './agreement-amendment-range-rail';

function defaultForm(): AgreementAmendmentFormState {
  return {
    operationType: 'modify_line',
    amendmentPath: '',
    effectivePeriodId: '',
    effectivePeriodEndId: '',
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
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<
    AgreementAmendmentAmbiguousLineCandidate[]
  >([]);

  const agreementId = agreement?.id ?? null;
  const canEdit = workspaceAllowed === true && agreementId != null;
  const currency = agreementDetails?.currency?.name ?? agreement?.currency?.name ?? null;

  const isPeriodBasedLineOperation =
    form.operationType === 'modify_line' || form.operationType === 'cancel_line';

  const allLineOptions = useMemo(
    () => resolveAmendmentAgreementLineOptions(agreementDetails ?? agreement),
    [agreement, agreementDetails],
  );

  const lineOptions = allLineOptions;

  const periodOptions = useMemo(
    () =>
      resolveAmendmentEffectivePeriodOptions({
        fetchedPeriods,
        previewOpenPeriods: preview?.openPeriods,
      }),
    [fetchedPeriods, preview?.openPeriods],
  );

  const selectedLine = useMemo(() => {
    if (!form.sourceLineId) return null;
    return lineOptions.find((line) => String(line.id) === form.sourceLineId) ?? null;
  }, [form.sourceLineId, lineOptions]);

  const selectedPeriod = useMemo(() => {
    if (!form.effectivePeriodId) return null;
    return periodOptions.find((period) => String(period.id) === form.effectivePeriodId) ?? null;
  }, [form.effectivePeriodId, periodOptions]);

  const hasSelectableLines = useMemo(() => {
    if (form.operationType === 'add_line') return true;
    return lineOptions.some((line) => isLineSelectableForAmendmentOperation(line, form.operationType));
  }, [form.operationType, lineOptions]);

  const availableAmendmentPaths = useMemo(() => {
    if (!selectedLine || form.operationType === 'add_line') return [];
    return resolveAvailableAmendmentPaths(selectedLine, form.operationType);
  }, [form.operationType, selectedLine]);

  const showAmendmentPathSelector = availableAmendmentPaths.length > 1;

  const showRangeRail = usesPeriodRangeForForm(form);

  const showAmountAdjustmentPanel =
    form.operationType === 'modify_line' &&
    form.amendmentPath === 'adjust_amount' &&
    selectedLine != null;

  const previewBlockedOneTime =
    preview != null && isBlockedByOneTimeLineNotPeriodAmendable(preview);

  const showMonthlyAmountField =
    form.operationType === 'modify_line' &&
    form.amendmentPath === 'period_range' &&
    selectedLine != null &&
    selectedLine.isOneTime !== true &&
    selectedLine.isMonthly !== false &&
    !previewBlockedOneTime;

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
    setAmbiguousCandidates([]);
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

  useEffect(() => {
    if (!isPeriodBasedLineOperation || !form.sourceLineId || !selectedLine) return;
    if (isLineSelectableForAmendmentOperation(selectedLine, form.operationType)) return;
    setForm((prev) => ({
      ...prev,
      sourceLineId: '',
      amendmentPath: '',
      amount: prev.operationType === 'cancel_line' ? '0' : '',
    }));
    setPreview(null);
    setPreviewReady(false);
  }, [form.operationType, form.sourceLineId, isPeriodBasedLineOperation, selectedLine]);

  useEffect(() => {
    if (!selectedLine || form.operationType === 'add_line') return;
    const paths = resolveAvailableAmendmentPaths(selectedLine, form.operationType);
    const defaultPath = resolveDefaultAmendmentPath(selectedLine, form.operationType);
    setForm((prev) => {
      if (paths.length === 1) {
        return prev.amendmentPath === paths[0] ? prev : { ...prev, amendmentPath: paths[0]! };
      }
      if (prev.amendmentPath && paths.includes(prev.amendmentPath)) return prev;
      return { ...prev, amendmentPath: defaultPath };
    });
  }, [form.operationType, selectedLine]);

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
    setFormError(null);
  }

  function updateOperationType(operationType: AgreementAmendmentOperationType) {
    setForm((prev) => ({
      ...prev,
      operationType,
      amendmentPath: operationType === 'cancel_line' ? 'period_range' : '',
      sourceLineId: '',
      feeTypeId: '',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      amount: operationType === 'cancel_line' ? '0' : '',
    }));
    invalidatePreview();
  }

  function updateAmendmentPath(amendmentPath: AgreementAmendmentPath) {
    setForm((prev) => ({
      ...prev,
      amendmentPath,
      effectivePeriodId: amendmentPath === 'adjust_amount' ? '' : prev.effectivePeriodId,
      effectivePeriodEndId: amendmentPath === 'adjust_amount' ? '' : prev.effectivePeriodEndId,
      amount:
        amendmentPath === 'adjust_amount' && selectedLine?.unitPrice != null
          ? String(selectedLine.unitPrice)
          : amendmentPath === 'period_range' && selectedLine?.amount != null
            ? String(selectedLine.amount)
            : prev.amount,
    }));
    invalidatePreview();
  }

  function handleLineSelection(sourceLineId: string) {
    const selected = lineOptions.find((line) => String(line.id) === sourceLineId);
    const defaultPath = resolveDefaultAmendmentPath(selected ?? null, form.operationType);
    setAmbiguousCandidates([]);
    setForm((prev) => ({
      ...prev,
      sourceLineId,
      amendmentPath:
        prev.operationType === 'cancel_line'
          ? 'period_range'
          : defaultPath || prev.amendmentPath,
      feeTypeId: selected?.feeTypeId != null ? String(selected.feeTypeId) : prev.feeTypeId,
      amount:
        prev.operationType === 'modify_line' &&
        (defaultPath === 'adjust_amount' || selected?.amountAmendable)
          ? selected?.unitPrice != null
            ? String(selected.unitPrice)
            : selected?.amount != null
              ? String(selected.amount)
              : ''
          : prev.operationType === 'modify_line' && selected?.amount != null
            ? String(selected.amount)
            : prev.operationType === 'cancel_line'
              ? '0'
              : prev.amount,
    }));
    invalidatePreview();
  }

  function handleAmbiguousCandidateSelection(candidate: AgreementAmendmentAmbiguousLineCandidate) {
    const matched =
      lineOptions.find((line) => line.id === candidate.sourceLineId) ??
      ({
        id: candidate.sourceLineId,
        sourceLineId: candidate.sourceLineId,
        agreementLineId: candidate.agreementLineId,
        label: candidate.serviceName,
        feeTypeId: null,
        amount: candidate.netAmount,
        unitPrice: candidate.unitPrice,
        quantity: candidate.quantity,
        commitmentType: candidate.commitmentType,
        pricingUnit: candidate.pricingUnit,
        periodAmendable: candidate.periodAmendable,
        amendmentBlockReason: candidate.amendmentBlockReason,
        amountAmendable: candidate.amountAmendable,
        amountAmendmentBlockReason: candidate.amountAmendmentBlockReason,
        supportedAmendmentOperations: candidate.supportedAmendmentOperations,
        duplicateServiceWarning: candidate.duplicateServiceWarning,
        operationalState: null,
        isInCurrentSchedule: null,
        openInstallmentCount: null,
        cancelledInstallmentCount: null,
        historicalInstallmentCount: null,
        canModify: null,
        canCancelLine: null,
        statusReasonCode: null,
      } satisfies AgreementAmendmentLineOption);
    setAmbiguousCandidates([]);
    setForm((prev) => ({
      ...prev,
      sourceLineId: String(matched.id),
      feeTypeId: matched.feeTypeId != null ? String(matched.feeTypeId) : prev.feeTypeId,
      amount:
        prev.operationType === 'modify_line' && matched.amount != null
          ? String(matched.amount)
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

    if (
      form.operationType !== 'add_line' &&
      selectedLine &&
      !isLineSelectableForAmendmentOperation(selectedLine, form.operationType)
    ) {
      const blockCode = resolveAgreementLineOperationBlockReasonCode(selectedLine, form.operationType);
      const blockKey = blockCode ? agreementAmendmentReasonMessageKey(blockCode) : null;
      const blockLabel = blockKey ? t(blockKey) : null;
      setFormError(
        blockLabel && blockKey && blockLabel !== blockKey
          ? blockLabel
          : t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'),
      );
      setForm((prev) => ({
        ...prev,
        sourceLineId: '',
        amendmentPath: prev.operationType === 'cancel_line' ? 'period_range' : '',
      }));
      setPreview(null);
      setPreviewReady(false);
      return;
    }

    if (!canSubmitAgreementAmendmentForm(form, selectedLine)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
      return;
    }

    setPreviewLoading(true);
    setFormError(null);
    setPreview(null);
    setPreviewReady(false);
    const payload = buildAgreementAmendmentPreviewPayload(agreementId, form, selectedLine);
    const prepared = await prepareAgreementAmendmentPayload(studentId, payload);
    if (!prepared.success) {
      setPreviewLoading(false);
      setPreview(null);
      setPreviewReady(false);
      setFormError(
        resolveAgreementAmendmentErrorMessage(
          prepared.error?.code,
          prepared.error?.message,
          t,
          prepared.error,
        ),
      );
      return;
    }
    const res = await previewAgreementAmendment(studentId, prepared.data);
    setPreviewLoading(false);

    if (!res.success) {
      if (isAmbiguousAgreementLineTargetError(res.error?.code)) {
        const candidates = readAmbiguousAgreementLineCandidates(res.error);
        setAmbiguousCandidates(candidates);
      }
      setPreview(null);
      setPreviewReady(false);
      setFormError(
        resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t, res.error),
      );
      return;
    }

    setAmbiguousCandidates([]);

    const normalized = normalizeAgreementAmendmentPreview(res.data);
    setPreview(normalized);
    setPreviewReady(true);
    setFormError(null);
  }

  async function handleApplyConfirmed() {
    if (!previewReady || !preview?.canApply || agreementId == null) return;
    if (!canSubmitAgreementAmendmentForm(form, selectedLine)) return;

    setApplyLoading(true);
    const payload = buildAgreementAmendmentApplyPayload(agreementId, form, selectedLine);
    const prepared = await prepareAgreementAmendmentPayload(studentId, payload);
    if (!prepared.success) {
      setApplyLoading(false);
      setFormError(
        resolveAgreementAmendmentErrorMessage(
          prepared.error?.code,
          prepared.error?.message,
          t,
          prepared.error,
        ),
      );
      setShowApplyConfirm(false);
      return;
    }
    const res = await applyAgreementAmendment(studentId, prepared.data);
    setApplyLoading(false);

    if (!res.success) {
      setFormError(
        resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t, res.error),
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
              <div>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.agreementAmendment.choosePeriodRange')}
                </span>
                <AgreementAmendmentRangeRail
                  periods={periodOptions}
                  startPeriodId={form.effectivePeriodId}
                  endPeriodId={form.effectivePeriodEndId}
                  loading={periodsLoading}
                  disabled={!canEdit}
                  onStartSelect={(periodId) => {
                    setForm((prev) => ({ ...prev, effectivePeriodId: periodId, effectivePeriodEndId: '' }));
                    invalidatePreview();
                  }}
                  onEndSelect={(periodId) => {
                    setForm((prev) => ({ ...prev, effectivePeriodEndId: periodId }));
                    invalidatePreview();
                  }}
                />
                {periodsError ? (
                  <span className="tiny muted">{periodsError}</span>
                ) : !periodOptions.length && !periodsLoading ? (
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.noPeriodsHint')}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="tiny muted">
                  {t('admin.student360.financeWorkspace.agreementAmendment.fields.line')}
                </span>
                <AgreementAmendmentLinePicker
                  lines={lineOptions}
                  selectedLineId={form.sourceLineId}
                  currency={currency}
                  operationType={form.operationType}
                  disabled={!canEdit || !lineOptions.length}
                  onSelect={handleLineSelection}
                />
                {isPeriodBasedLineOperation && !hasSelectableLines ? (
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.noPeriodAmendableLinesHint')}
                  </span>
                ) : null}
              </div>

              {selectedLine && availableAmendmentPaths.length === 0 ? (
                <p className="form-error" role="alert">
                  {selectedLine.amountAmendmentBlockReason
                    ? resolveAgreementAmendmentErrorMessage(
                        selectedLine.amountAmendmentBlockReason,
                        undefined,
                        t,
                      )
                    : t('admin.student360.financeWorkspace.agreementAmendment.lineAmountNotAmendable')}
                </p>
              ) : null}

              {showAmendmentPathSelector ? (
                <fieldset className="student-finance-amendment-path-selector">
                  <legend className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.amendmentPathLegend')}
                  </legend>
                  <div className="row">
                    {availableAmendmentPaths.includes('adjust_amount') ? (
                      <label className="student-finance-amendment-path-selector__option">
                        <input
                          type="radio"
                          name="amendmentPath"
                          checked={form.amendmentPath === 'adjust_amount'}
                          onChange={() => updateAmendmentPath('adjust_amount')}
                          disabled={!canEdit}
                        />
                        {t('admin.student360.financeWorkspace.agreementAmendment.adjustLineAmountTitle')}
                      </label>
                    ) : null}
                    {availableAmendmentPaths.includes('period_range') ? (
                      <label className="student-finance-amendment-path-selector__option">
                        <input
                          type="radio"
                          name="amendmentPath"
                          checked={form.amendmentPath === 'period_range'}
                          onChange={() => updateAmendmentPath('period_range')}
                          disabled={!canEdit}
                        />
                        {t('admin.student360.financeWorkspace.agreementAmendment.periodRangeTitle')}
                      </label>
                    ) : null}
                  </div>
                </fieldset>
              ) : null}

              {showAmountAdjustmentPanel && selectedLine ? (
                <AgreementAmendmentAmountAdjustmentPanel
                  line={selectedLine}
                  currency={currency}
                  newAmount={form.amount}
                  disabled={!canEdit}
                  onAmountChange={(amount) => {
                    setForm((prev) => ({ ...prev, amount }));
                    invalidatePreview();
                  }}
                />
              ) : null}

              {showRangeRail ? (
                <div>
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.choosePeriodRange')}
                  </span>
                  <AgreementAmendmentRangeRail
                    periods={periodOptions}
                    startPeriodId={form.effectivePeriodId}
                    endPeriodId={form.effectivePeriodEndId}
                    loading={periodsLoading}
                    disabled={!canEdit}
                    scopeSelectionEnabled={
                      form.operationType === 'modify_line' && form.amendmentPath === 'period_range'
                    }
                    onStartSelect={(periodId) => {
                      setForm((prev) => ({
                        ...prev,
                        effectivePeriodId: periodId,
                        effectivePeriodEndId: '',
                      }));
                      invalidatePreview();
                    }}
                    onEndSelect={(periodId) => {
                      setForm((prev) => ({ ...prev, effectivePeriodEndId: periodId }));
                      invalidatePreview();
                    }}
                  />
                  {periodsError ? (
                    <span className="tiny muted">{periodsError}</span>
                  ) : !periodOptions.length && !periodsLoading ? (
                    <span className="tiny muted">
                      {t('admin.student360.financeWorkspace.agreementAmendment.noPeriodsHint')}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {form.operationType === 'modify_line' && showMonthlyAmountField ? (
                <label>
                  <span className="tiny muted">
                    {t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPrice')}
                  </span>
                  <p className="tiny muted student-finance-amendment-form__hint">
                    {t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPriceHint')}
                  </p>
                  <p className="tiny muted student-finance-amendment-form__example">
                    {t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPriceExample')}
                  </p>
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
              {form.operationType === 'modify_line' && previewBlockedOneTime ? (
                <p className="tiny muted student-finance-amendment-form__hint" role="note">
                  {t('admin.student360.financeWorkspace.agreementAmendment.oneTimeNoMonthlyPrice')}
                </p>
              ) : null}
            </>
          )}

          {selectedLine && selectedPeriod ? (
            <section className="student-finance-amendment-selection-summary" aria-live="polite">
              <h4>{t('admin.student360.financeWorkspace.agreementAmendment.selectionSummaryTitle')}</h4>
              <dl className="detail-list compact">
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.fields.line')}</dt>
                  <dd dir="auto">{selectedLine.label}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.effectivePeriod')}</dt>
                  <dd dir="auto">{formatAmendmentEffectivePeriodLabel(selectedPeriod, t)}</dd>
                </div>
                {preview?.affectedPeriods.length ? (
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.agreementAmendment.affectedPeriods')}</dt>
                    <dd dir="auto">{preview.affectedPeriods.join(', ')}</dd>
                  </div>
                ) : null}
                {preview?.lockedPeriods.length ? (
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.agreementAmendment.lockedPeriods')}</dt>
                    <dd dir="auto">{preview.lockedPeriods.join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {ambiguousCandidates.length ? (
            <section className="student-finance-amendment-ambiguous" role="alert">
              <p>{t('admin.student360.financeWorkspace.agreementAmendment.errors.ambiguousAgreementLineTarget')}</p>
              <ul className="student-finance-amendment-ambiguous__list">
                {ambiguousCandidates.map((candidate) => (
                  <li key={candidate.sourceLineId}>
                    <button
                      type="button"
                      className="student-finance-amendment-line-picker__card"
                      onClick={() => handleAmbiguousCandidateSelection(candidate)}
                    >
                      <span className="student-finance-amendment-line-picker__name" dir="auto">
                        {candidate.serviceName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          {preview?.warnings.length ? (
            <div className="student-finance-amendment-preview__warnings-banner" role="status">
              <h4>{t('admin.student360.financeWorkspace.agreementAmendment.warnings')}</h4>
              <ul className="student-finance-amendment-preview__warnings">
                {preview.warnings.map((warning) => (
                  <li key={`${warning.code}-${warning.message ?? ''}`}>
                    {resolveAgreementAmendmentWarningMessage(warning, t, preview.pricingContract)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="row">
            <button type="submit" className="btn btn--primary" disabled={previewLoading || !canEdit}>
              {previewLoading
                ? t('common.loading')
                : showAmountAdjustmentPanel
                  ? t('admin.student360.financeWorkspace.agreementAmendment.previewAdjustAmount')
                  : t('admin.student360.financeWorkspace.agreementAmendment.preview')}
            </button>
            {previewReady && preview?.canApply ? (
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

            {shouldShowAgreementAmendmentBlockingReasons(preview) ? (
              <div className="student-finance-amendment-preview__not-allowed" role="alert">
                <h4>{t('admin.student360.financeWorkspace.agreementAmendment.notAllowedTitle')}</h4>
                {preview.blockingReasons.map((reason) => (
                  <p key={reason.code}>{resolveAgreementAmendmentBlockingMessage(reason, t)}</p>
                ))}
                {isBlockedByOneTimeLineNotPeriodAmendable(preview) ? (
                  <p className="student-finance-amendment-preview__not-allowed-hint">
                    {t('admin.student360.financeWorkspace.agreementAmendment.oneTimeBlockedHint')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <dl className="detail-list compact">
              {shouldShowAgreementAmendmentAllowedStatus(preview) ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.agreementAmendment.allowed')}</dt>
                  <dd>{t('admin.student360.financeWorkspace.agreementAmendment.allowedYes')}</dd>
                </div>
              ) : null}
              {shouldShowAgreementAmendmentLegacyAmounts(preview) && preview.amountBefore != null ? (
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
              {shouldShowAgreementAmendmentLegacyAmounts(preview) && preview.amountAfter != null ? (
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
              {shouldShowAgreementAmendmentLegacyAmounts(preview) && preview.delta != null ? (
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

            {hasAgreementAmendmentPricingContract(preview.pricingContract) && preview.pricingContract ? (
              <AgreementAmendmentPricingContractPreview
                contract={preview.pricingContract}
                currency={preview.currency}
                labelMode={resolveAgreementAmendmentPricingContractLabelMode(
                  form.operationType,
                  form.amendmentPath,
                )}
              />
            ) : null}

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
                    <li key={`${warning.code}-${warning.message ?? ''}`}>
                      {resolveAgreementAmendmentWarningMessage(warning, t, preview.pricingContract)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {shouldShowAgreementAmendmentBlockingReasons(preview) &&
            !isBlockedByOneTimeLineNotPeriodAmendable(preview) ? (
              <div>
                <h4>{t('admin.student360.financeWorkspace.agreementAmendment.blockingReasons')}</h4>
                <ul className="student-finance-amendment-preview__blockers">
                  {preview.blockingReasons.map((reason) => (
                    <li key={reason.code}>
                      {resolveAgreementAmendmentBlockingMessage(reason, t)}
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