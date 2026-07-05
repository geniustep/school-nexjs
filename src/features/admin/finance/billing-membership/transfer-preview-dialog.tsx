'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { applyTransferInPreview, getTransferInPreview } from '@/lib/finance/billing-membership-api';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  ApplySubmitGuard,
  applyErrorRecoveryAction,
  buildPreviewContextSignature,
  buildTransferApplyRequest,
  canProceedToApplyConfirmation,
  previewMatchesContext,
  resolveTransferApplyEligibility,
  transferApplyConfirmTitleKey,
  transferApplyConfirmLabelKey,
  transferApplyContinueLabelKey,
  transferApplyOperationLabelKey,
  transferApplySuccessMessageKey,
  transferPreviewTitleKey,
  type PreviewContextInput,
  type TransferEligibilityContext,
} from '@/lib/utils/billing-membership-apply';
import {
  billingMembershipErrorMessageKey,
  resolveTransferPreviewPhase,
  transferPreviewFeeReasonKey,
  transferPreviewWarningKey,
  validateMembershipReason,
} from '@/lib/utils/normalize-billing-membership';
import type {
  FeeTransferMode,
  TransferApplyResult,
  TransferPreviewFee,
  TransferPreviewPayload,
} from '@/types/finance-billing-membership';
import { FEE_TRANSFER_MODES } from '@/types/finance-billing-membership';

type WorkflowStep = 'review' | 'confirm' | 'success';

const MODE_LABEL_KEYS: Record<FeeTransferMode, string> = {
  membership_only: 'admin.finance.billingAccounts.members.preview.modes.membershipOnly.label',
  future_only: 'admin.finance.billingAccounts.members.preview.modes.futureOnly.label',
  open_unpaid_items: 'admin.finance.billingAccounts.members.preview.modes.openUnpaid.label',
  selected_items: 'admin.finance.billingAccounts.members.preview.modes.selectedItems.label',
};

const MODE_HINT_KEYS: Record<FeeTransferMode, string> = {
  membership_only: 'admin.finance.billingAccounts.members.preview.modes.membershipOnly.hint',
  future_only: 'admin.finance.billingAccounts.members.preview.modes.futureOnly.hint',
  open_unpaid_items: 'admin.finance.billingAccounts.members.preview.modes.openUnpaid.hint',
  selected_items: 'admin.finance.billingAccounts.members.preview.modes.selectedItems.hint',
};

function FeeImpactTable({
  fees,
  emptyLabel,
}: {
  fees: TransferPreviewFee[];
  emptyLabel: string;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!fees.length) {
    return <p className="muted tiny">{emptyLabel}</p>;
  }

  return (
    <ul className="billing-membership-preview-fees">
      {fees.map((fee) => (
        <li key={fee.fee_id} className="billing-membership-preview-fees__row">
          <div className="billing-membership-preview-fees__main" dir="auto">
            <strong>{fee.name ?? `#${fee.fee_id}`}</strong>
            {fee.due_date ? (
              <span className="tiny muted">{formatDate(fee.due_date)}</span>
            ) : null}
          </div>
          <div className="billing-membership-preview-fees__amounts">
            <FinanceMoney amount={fee.balance_amount ?? fee.net_amount} />
          </div>
          {fee.reason ? (
            <p className="tiny muted billing-membership-preview-fees__reason">
              {t(transferPreviewFeeReasonKey(fee.reason))}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TransferPreviewDialog({
  billingPartnerId,
  studentId,
  studentName,
  reason,
  startDate,
  academicYearId,
  activeMembershipPartnerId,
  open,
  canManage,
  onClose,
  onApplied,
}: {
  billingPartnerId: number;
  studentId: number;
  studentName: string;
  reason: string;
  startDate: string;
  academicYearId?: number | null;
  activeMembershipPartnerId?: number | null;
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const t = useT();
  const applyGuardRef = useRef(new ApplySubmitGuard());
  const [mode, setMode] = useState<FeeTransferMode>('membership_only');
  const [preview, setPreview] = useState<TransferPreviewPayload | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [candidateFees, setCandidateFees] = useState<TransferPreviewFee[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState<number[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('review');
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmReasonError, setConfirmReasonError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<TransferApplyResult | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  const contextInput = useMemo<PreviewContextInput>(
    () => ({
      billingPartnerId,
      studentId,
      academicYearId,
      startDate,
      mode,
      selectedFeeIds,
    }),
    [billingPartnerId, studentId, academicYearId, startDate, mode, selectedFeeIds],
  );

  const resetState = useCallback(() => {
    applyGuardRef.current.release();
    setMode('membership_only');
    setPreview(null);
    setPreviewSignature(null);
    setCandidateFees([]);
    setSelectedFeeIds([]);
    setSelectionError(null);
    setLoading(false);
    setErrorCode(null);
    setErrorStatus(undefined);
    setWorkflowStep('review');
    setConfirmReason(reason.trim());
    setConfirmReasonError(null);
    setIsApplying(false);
    setApplyResult(null);
    setApplyError(null);
    setStaleNotice(null);
  }, [reason]);

  useEffect(() => {
    if (open) resetState();
  }, [open, billingPartnerId, studentId, resetState]);

  const loadPreview = useCallback(
    async (nextMode: FeeTransferMode, feeIds: number[] = []) => {
      if (nextMode === 'selected_items' && feeIds.length === 0) {
        setSelectionError(t('admin.finance.billingAccounts.members.preview.selectAtLeastOneFee'));
        setPreview(null);
        setPreviewSignature(null);
        setErrorCode(null);
        return;
      }

      setSelectionError(null);
      setLoading(true);
      setErrorCode(null);
      setPreview(null);
      setPreviewSignature(null);
      setWorkflowStep('review');
      setApplyError(null);

      const res = await getTransferInPreview(billingPartnerId, studentId, {
        fee_transfer_mode: nextMode,
        start_date: startDate.trim() || undefined,
        academic_year_id: academicYearId ?? undefined,
        fee_ids: nextMode === 'selected_items' ? feeIds : undefined,
      });

      setLoading(false);

      if (!res.success) {
        setErrorCode(res.error?.code ?? 'validation_error');
        setErrorStatus(
          typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined,
        );
        return;
      }

      setPreview(res.data);
      setPreviewSignature(
        buildPreviewContextSignature({
          billingPartnerId,
          studentId,
          academicYearId,
          startDate,
          mode: nextMode,
          selectedFeeIds: nextMode === 'selected_items' ? feeIds : [],
        }),
      );
      if (nextMode === 'open_unpaid_items' || nextMode === 'membership_only') {
        const movable = res.data.movable_fees.length
          ? res.data.movable_fees
          : res.data.movable_fee_ids.map((id) => ({ fee_id: id, name: `#${id}` }));
        if (movable.length) setCandidateFees(movable as TransferPreviewFee[]);
      }
    },
    [academicYearId, billingPartnerId, startDate, studentId, t],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === 'selected_items') return;
    void loadPreview(mode);
  }, [open, mode, loadPreview]);

  useEffect(() => {
    if (!open || mode !== 'selected_items') return;
    void getTransferInPreview(billingPartnerId, studentId, {
      fee_transfer_mode: 'open_unpaid_items',
      start_date: startDate.trim() || undefined,
      academic_year_id: academicYearId ?? undefined,
    }).then((res) => {
      if (!res.success) return;
      const movable = res.data.movable_fees.length
        ? res.data.movable_fees
        : res.data.movable_fee_ids.map((id) => ({ fee_id: id, name: `#${id}` }));
      if (movable.length) setCandidateFees(movable as TransferPreviewFee[]);
    });
  }, [open, mode, billingPartnerId, studentId, startDate, academicYearId]);

  useEffect(() => {
    if (!previewSignature || mode !== 'selected_items') return;
    if (!previewMatchesContext(preview, previewSignature, contextInput)) {
      setPreviewSignature(null);
      setWorkflowStep('review');
    }
  }, [contextInput, mode, preview, previewSignature]);

  const eligibilityContext = useMemo<TransferEligibilityContext>(
    () => ({
      targetPartnerId: billingPartnerId,
      activeMembershipPartnerId,
    }),
    [billingPartnerId, activeMembershipPartnerId],
  );

  const eligibility = resolveTransferApplyEligibility(preview, mode, eligibilityContext);
  const canProceed = canProceedToApplyConfirmation(
    preview,
    mode,
    previewSignature,
    contextInput,
    eligibilityContext,
  );
  const phase = resolveTransferPreviewPhase({ loading, errorCode, preview });
  const aligned = eligibility === 'aligned_noop';
  const realignment = eligibility === 'fee_realignment';
  const dialogBusy = loading || isApplying;

  const titleKey =
    workflowStep === 'success'
      ? 'admin.finance.billingAccounts.members.apply.resultTitle'
      : workflowStep === 'confirm'
        ? transferApplyConfirmTitleKey(eligibility)
        : transferPreviewTitleKey(eligibility);

  const toggleFee = (feeId: number) => {
    setSelectedFeeIds((current) =>
      current.includes(feeId) ? current.filter((id) => id !== feeId) : [...current, feeId],
    );
    setPreviewSignature(null);
    setPreview(null);
    setWorkflowStep('review');
    setApplyError(null);
  };

  const handleContinueToConfirm = () => {
    if (!canManage || !canProceed) return;
    setConfirmReasonError(null);
    setWorkflowStep('confirm');
  };

  const handleApply = async () => {
    if (!canManage || isApplying || !applyGuardRef.current.tryAcquire()) return;
    if (!preview || !canProceedToApplyConfirmation(preview, mode, previewSignature, contextInput, eligibilityContext)) {
      applyGuardRef.current.release();
      return;
    }
    if (!validateMembershipReason(confirmReason)) {
      setConfirmReasonError(t('admin.finance.billingAccounts.members.apply.reasonRequired'));
      applyGuardRef.current.release();
      return;
    }

    setIsApplying(true);
    setApplyError(null);

    const request = buildTransferApplyRequest({
      preview,
      mode,
      reason: confirmReason,
      startDate,
      academicYearId,
      selectedFeeIds,
    });

    const res = await applyTransferInPreview(billingPartnerId, studentId, request);
    setIsApplying(false);

    if (!res.success) {
      applyGuardRef.current.release();
      const code = res.error?.code;
      const status =
        typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined;
      const recovery = applyErrorRecoveryAction(code);

      if (recovery === 'refresh_preview') {
        setPreview(null);
        setPreviewSignature(null);
        setWorkflowStep('review');
        if (code === 'preview_stale') {
          setStaleNotice(t('admin.finance.billingAccounts.members.apply.staleDuringApply'));
        } else {
          setApplyError(t(billingMembershipErrorMessageKey(code, status)));
        }
        void loadPreview(mode, mode === 'selected_items' ? selectedFeeIds : []);
        return;
      }

      if (recovery === 'clear_selection') {
        setSelectedFeeIds([]);
        setPreview(null);
        setPreviewSignature(null);
        setWorkflowStep('review');
        setApplyError(t('admin.finance.billingAccounts.members.errors.feeIdsNotEligible'));
        return;
      }

      setApplyError(t(billingMembershipErrorMessageKey(code, status)));
      return;
    }

    setApplyResult(res.data);
    setWorkflowStep('success');
    onApplied?.();
  };

  const handleClose = () => {
    if (dialogBusy) return;
    onClose();
  };

  if (!open) return null;

  const movableCount =
    preview?.movable_fee_ids.length ??
    preview?.movable_fees.length ??
    applyResult?.moved_fee_ids.length ??
    0;

  return (
    <div className="modal-backdrop" role="presentation" onClick={dialogBusy ? undefined : handleClose}>
      <div
        className="card modal-panel modal-panel--form billing-membership-dialog billing-membership-preview-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t(titleKey)}</h3>
        <p className="muted" dir="auto">
          {studentName}
        </p>

        {workflowStep === 'success' && applyResult ? (
          <div className="billing-membership-apply-result" role="status">
            <p>{t(transferApplySuccessMessageKey(applyResult))}</p>
            <ul className="billing-membership-apply-result__stats">
              <li>
                {t('admin.finance.billingAccounts.members.apply.resultMovedCount', {
                  count: applyResult.moved_fee_ids.length,
                })}
              </li>
              <li>
                {t('admin.finance.billingAccounts.members.apply.resultAmountMoved')}:{' '}
                <FinanceMoney amount={applyResult.amount_moved ?? 0} />
              </li>
              <li>
                {t('admin.finance.billingAccounts.members.apply.resultMembershipChanged')}:{' '}
                {applyResult.membership_changed
                  ? t('common.yes')
                  : t('common.no')}
              </li>
            </ul>
          </div>
        ) : null}

        {workflowStep === 'confirm' && preview ? (
          <section className="billing-membership-apply-confirm">
            {realignment ? (
              <p className="billing-membership-apply-confirm__realignment-note" role="status">
                {t('admin.finance.billingAccounts.members.apply.realignmentConfirmNotice')}
              </p>
            ) : null}
            <dl className="billing-membership-apply-confirm__summary">
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryStudent')}</dt>
                <dd dir="auto">{studentName}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryFrom')}</dt>
                <dd className="mono">#{preview.from_billing_partner_id ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryTo')}</dt>
                <dd className="mono">#{preview.to_billing_partner_id ?? billingPartnerId}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryOperation')}</dt>
                <dd>{t(transferApplyOperationLabelKey(eligibility))}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryMovableCount')}</dt>
                <dd>{movableCount}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryAmountMoved')}</dt>
                <dd>
                  <FinanceMoney amount={preview.totals.amount_movable} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryAmountPreserved')}</dt>
                <dd>
                  <FinanceMoney amount={preview.totals.amount_preserved} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingAccounts.members.apply.summaryAmountBlocked')}</dt>
                <dd>
                  <FinanceMoney amount={preview.totals.amount_blocked} />
                </dd>
              </div>
            </dl>

            <label className="billing-membership-dialog__field">
              <span>
                {t('admin.finance.billingAccounts.members.apply.reasonLabel')}
                <span className="billing-membership-dialog__required" aria-hidden>
                  {' '}
                  *
                </span>
              </span>
              <textarea
                className="input"
                rows={3}
                value={confirmReason}
                disabled={isApplying}
                aria-invalid={confirmReasonError ? true : undefined}
                onChange={(e) => {
                  setConfirmReason(e.target.value);
                  if (confirmReasonError) setConfirmReasonError(null);
                }}
              />
              {confirmReasonError ? <span className="form-error">{confirmReasonError}</span> : null}
            </label>

            {applyError ? (
              <p className="form-error" role="alert">
                {applyError}
              </p>
            ) : null}
          </section>
        ) : null}

        {workflowStep === 'review' ? (
          <>
            <p className="tiny muted">{t('admin.finance.billingAccounts.members.preview.subtitle')}</p>

            <fieldset className="billing-membership-preview-modes">
              <legend>{t('admin.finance.billingAccounts.members.preview.modeLegend')}</legend>
              {FEE_TRANSFER_MODES.map((item) => (
                <label key={item} className="billing-membership-preview-modes__option">
                  <input
                    type="radio"
                    name="fee_transfer_mode"
                    value={item}
                    checked={mode === item}
                    disabled={dialogBusy}
                    onChange={() => {
                      setMode(item);
                      setPreview(null);
                      setPreviewSignature(null);
                      setErrorCode(null);
                      setWorkflowStep('review');
                      setApplyError(null);
                      setStaleNotice(null);
                      if (item !== 'selected_items') setSelectedFeeIds([]);
                    }}
                  />
                  <span>
                    <strong>{t(MODE_LABEL_KEYS[item])}</strong>
                    <span className="tiny muted">{t(MODE_HINT_KEYS[item])}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {mode === 'selected_items' ? (
              <section className="billing-membership-preview-selection">
                <h4>{t('admin.finance.billingAccounts.members.preview.selectedItemsTitle')}</h4>
                {!candidateFees.length ? (
                  <p className="muted tiny">
                    {t('admin.finance.billingAccounts.members.preview.selectedItemsHint')}
                  </p>
                ) : (
                  <ul className="billing-membership-preview-selection__list">
                    {candidateFees.map((fee) => (
                      <li key={fee.fee_id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedFeeIds.includes(fee.fee_id)}
                            disabled={dialogBusy}
                            onChange={() => toggleFee(fee.fee_id)}
                          />
                          <span dir="auto">{fee.name ?? `#${fee.fee_id}`}</span>
                          <FinanceMoney amount={fee.balance_amount ?? fee.net_amount} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {selectionError ? <span className="form-error">{selectionError}</span> : null}
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={dialogBusy}
                  onClick={() => void loadPreview('selected_items', selectedFeeIds)}
                >
                  {loading
                    ? t('common.loading')
                    : t('admin.finance.billingAccounts.members.preview.refreshPreview')}
                </button>
              </section>
            ) : null}

            {loading ? (
              <LoadingState label={t('admin.finance.billingAccounts.members.preview.loading')} />
            ) : null}

            {staleNotice ? (
              <div className="billing-membership-preview-state billing-membership-preview-state--stale" role="alert">
                <p>{staleNotice}</p>
              </div>
            ) : null}

            {errorCode && !loading ? (
              <ApiErrorView
                error={{
                  code: errorCode,
                  message: t(billingMembershipErrorMessageKey(errorCode, errorStatus)),
                }}
                onRetry={() => void loadPreview(mode, mode === 'selected_items' ? selectedFeeIds : [])}
              />
            ) : null}

            {applyError && !loading ? (
              <p className="form-error" role="alert">
                {applyError}
              </p>
            ) : null}

            {preview && !loading && !errorCode ? (
              <div className="billing-membership-preview-impact">
                {aligned ? (
                  <div
                    className="billing-membership-preview-state billing-membership-preview-state--aligned"
                    role="status"
                  >
                    <p>{t('admin.finance.billingAccounts.members.preview.alignedNoOp')}</p>
                  </div>
                ) : null}

                {realignment && !aligned ? (
                  <div
                    className="billing-membership-preview-state billing-membership-preview-state--realignment"
                    role="status"
                  >
                    <p>{t('admin.finance.billingAccounts.members.preview.realignmentNotice')}</p>
                  </div>
                ) : null}

                {preview.warnings.length ? (
                  <ul className="billing-membership-warnings billing-membership-preview-warnings">
                    {preview.warnings.map((warning, index) => (
                      <li key={`${warning.code ?? 'warning'}-${index}`}>
                        {t(transferPreviewWarningKey(warning))}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="billing-membership-preview-partners">
                  <div>
                    <span className="tiny muted">
                      {t('admin.finance.billingAccounts.members.preview.fromPartner')}
                    </span>
                    <strong className="mono">#{preview.from_billing_partner_id ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="tiny muted">
                      {t('admin.finance.billingAccounts.members.preview.toPartner')}
                    </span>
                    <strong className="mono">#{preview.to_billing_partner_id ?? billingPartnerId}</strong>
                  </div>
                </div>

                <section className="billing-membership-preview-bucket">
                  <h4>{t('admin.finance.billingAccounts.members.preview.movableTitle')}</h4>
                  <p className="billing-membership-preview-bucket__amount">
                    <FinanceMoney amount={preview.totals.amount_movable} />
                  </p>
                  <FeeImpactTable
                    fees={preview.movable_fees}
                    emptyLabel={t('admin.finance.billingAccounts.members.preview.movableEmpty')}
                  />
                </section>

                <section className="billing-membership-preview-bucket">
                  <h4>{t('admin.finance.billingAccounts.members.preview.preservedTitle')}</h4>
                  <p className="billing-membership-preview-bucket__amount">
                    <FinanceMoney amount={preview.totals.amount_preserved} />
                  </p>
                  <FeeImpactTable
                    fees={preview.preserved_fees}
                    emptyLabel={t('admin.finance.billingAccounts.members.preview.preservedEmpty')}
                  />
                </section>

                <section className="billing-membership-preview-bucket">
                  <h4>{t('admin.finance.billingAccounts.members.preview.blockedTitle')}</h4>
                  <p className="billing-membership-preview-bucket__amount">
                    <FinanceMoney amount={preview.totals.amount_blocked} />
                  </p>
                  <FeeImpactTable
                    fees={preview.blocked_fees}
                    emptyLabel={t('admin.finance.billingAccounts.members.preview.blockedEmpty')}
                  />
                </section>

                {phase === 'blocked' ? (
                  <div
                    className="billing-membership-preview-state billing-membership-preview-state--blocked"
                    role="alert"
                  >
                    <p>{t('admin.finance.billingAccounts.members.preview.blockedNotice')}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="billing-membership-dialog__actions">
          {workflowStep === 'review' && canManage && canProceed ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={dialogBusy}
              onClick={handleContinueToConfirm}
            >
              {t(transferApplyContinueLabelKey(eligibility))}
            </button>
          ) : null}

          {workflowStep === 'confirm' ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={isApplying || !canProceed}
                onClick={() => void handleApply()}
              >
                {isApplying
                  ? t('admin.finance.billingAccounts.members.apply.executing')
                  : t(transferApplyConfirmLabelKey(eligibility))}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={isApplying}
                onClick={() => {
                  setWorkflowStep('review');
                  setApplyError(null);
                }}
              >
                {t('admin.finance.billingAccounts.members.apply.backToPreview')}
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleClose}
            disabled={dialogBusy}
          >
            {workflowStep === 'success' ? t('common.close') : t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
