'use client';

import { useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  applyAgreementAmendment,
  fetchAgreementAmendmentEffectivePeriods,
  fetchFinancialAgreement,
  previewAgreementAmendment,
} from '../api/finance-admin-api';
import type {
  AgreementAmendmentAmbiguousLineCandidate,
  AgreementAmendmentFormState,
  AgreementAmendmentPeriodOption,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
import {
  agreementAmendmentReasonMessageKey,
  resolveAgreementAmendmentErrorMessage,
} from '../utils/agreement-amendment-errors';
import { isLineSelectableForAmendmentOperation } from '../utils/agreement-amendment-path';
import {
  lineSupportsModifyLine,
  resolveAgreementLineOperationBlockReasonCode,
} from '../utils/agreement-amendment-line-eligibility';
import {
  buildAgreementAmendmentApplyPayload,
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
  canSubmitAgreementAmendmentReason,
} from '../utils/build-agreement-amendment-payload';
import { prepareAgreementAmendmentPayload } from '../utils/prepare-agreement-amendment-payload';
import { normalizeAgreementAmendmentPreview } from '../utils/normalize-agreement-amendment-preview';
import {
  resolveAmendmentAgreementLineOptions,
  resolveAmendmentEffectivePeriodOptions,
} from '../utils/resolve-amendment-form-options';
import {
  isAmbiguousAgreementLineTargetError,
  readAmbiguousAgreementLineCandidates,
} from '../utils/resolve-agreement-amendment-ambiguous-target';
import { AgreementAmendmentLinePicker } from './agreement-amendment-line-picker';
import { AgreementAmendmentReasonSelector } from './agreement-amendment-reason-selector';
import { AgreementAmendmentLivePreviewPanel } from './agreement-amendment-live-preview-panel';
import { AgreementAmendmentSparsePeriodGrid } from './agreement-amendment-sparse-period-grid';
import { useAgreementAmendmentAutoPreview } from './use-agreement-amendment-auto-preview';
import './agreement-amendment-studio.css';

const COPY = {
  ar: {
    newPrice: 'السعر الجديد',
    noServices: 'لا توجد خدمات قابلة لتعديل السعر.',
    noPeriods: 'لا توجد أشهر قابلة للتعديل.',
  },
  fr: {
    newPrice: 'Nouveau prix',
    noServices: 'Aucun service modifiable.',
    noPeriods: 'Aucun mois modifiable.',
  },
  en: {
    newPrice: 'New price',
    noServices: 'No service can be amended.',
    noPeriods: 'No amendable months are available.',
  },
  es: {
    newPrice: 'Nuevo precio',
    noServices: 'No hay servicios modificables.',
    noPeriods: 'No hay meses modificables.',
  },
} as const;

type SparseAgreementAmendmentFormState = AgreementAmendmentFormState & {
  selectedPeriodIds: string[];
  periodAmountOverrides: Record<string, string>;
};

function defaultForm(): SparseAgreementAmendmentFormState {
  return {
    operationType: 'modify_line',
    amendmentPath: 'period_range',
    effectivePeriodId: '',
    effectivePeriodEndId: '',
    selectedPeriodIds: [],
    periodAmountOverrides: {},
    reason: '',
    sourceLineId: '',
    feeTypeId: '',
    amount: '',
  };
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
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const toast = useToast();
  const { rootRef } = useAgreementAmendmentAutoPreview<HTMLFormElement>();
  const [form, setForm] = useState<SparseAgreementAmendmentFormState>(defaultForm);
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
  const [periodSelectionInitializedLineId, setPeriodSelectionInitializedLineId] = useState<string | null>(null);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<AgreementAmendmentAmbiguousLineCandidate[]>([]);

  const agreementId = agreement?.id ?? null;
  const canEdit = workspaceAllowed === true && agreementId != null;
  const currency = agreementDetails?.currency?.name ?? agreement?.currency?.name ?? null;

  const allLineOptions = useMemo(
    () => resolveAmendmentAgreementLineOptions(agreementDetails ?? agreement),
    [agreement, agreementDetails],
  );
  const lineOptions = useMemo(
    () => allLineOptions.filter((line) => lineSupportsModifyLine(line)),
    [allLineOptions],
  );
  const periodOptions = useMemo(
    () => resolveAmendmentEffectivePeriodOptions({
      fetchedPeriods,
      previewOpenPeriods: preview?.openPeriods,
    }),
    [fetchedPeriods, preview?.openPeriods],
  );
  const selectedLine = useMemo(() => {
    if (!form.sourceLineId) return null;
    return lineOptions.find((line) => String(line.id) === form.sourceLineId) ?? null;
  }, [form.sourceLineId, lineOptions]);

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
    setPeriodSelectionInitializedLineId(null);
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
    if (!form.sourceLineId || !periodOptions.length) return;
    if (periodSelectionInitializedLineId === form.sourceLineId) return;
    const selectedPeriodIds = periodOptions
      .filter((period) => period.selectable !== false)
      .map((period) => String(period.id));
    setForm((prev) => ({
      ...prev,
      selectedPeriodIds,
      periodAmountOverrides: {},
    }));
    setPeriodSelectionInitializedLineId(form.sourceLineId);
    setPreview(null);
    setPreviewReady(false);
  }, [form.sourceLineId, periodOptions, periodSelectionInitializedLineId]);

  function resetAndClose() {
    setForm(defaultForm());
    setPreview(null);
    setPreviewReady(false);
    setFormError(null);
    setShowApplyConfirm(false);
    setPeriodSelectionInitializedLineId(null);
    onClose();
  }

  function invalidatePreview() {
    setPreview(null);
    setPreviewReady(false);
    setFormError(null);
  }

  function handleLineSelection(sourceLineId: string) {
    const selected = lineOptions.find((line) => String(line.id) === sourceLineId);
    setAmbiguousCandidates([]);
    setPeriodSelectionInitializedLineId(null);
    setForm((prev) => ({
      ...prev,
      operationType: 'modify_line',
      amendmentPath: 'period_range',
      sourceLineId,
      feeTypeId: selected?.feeTypeId != null ? String(selected.feeTypeId) : '',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      selectedPeriodIds: [],
      periodAmountOverrides: {},
      amount:
        selected?.unitPrice != null
          ? String(selected.unitPrice)
          : selected?.amount != null
            ? String(selected.amount)
            : '',
    }));
    invalidatePreview();
  }

  function togglePeriod(periodId: string) {
    setForm((prev) => {
      const selected = prev.selectedPeriodIds.includes(periodId);
      if (!selected) {
        return { ...prev, selectedPeriodIds: [...prev.selectedPeriodIds, periodId] };
      }
      const nextOverrides = { ...prev.periodAmountOverrides };
      delete nextOverrides[periodId];
      return {
        ...prev,
        selectedPeriodIds: prev.selectedPeriodIds.filter((id) => id !== periodId),
        periodAmountOverrides: nextOverrides,
      };
    });
    invalidatePreview();
  }

  function updatePeriodOverride(periodId: string, amount: string) {
    setForm((prev) => ({
      ...prev,
      periodAmountOverrides: {
        ...prev.periodAmountOverrides,
        [periodId]: amount,
      },
    }));
    invalidatePreview();
  }

  function clearPeriodOverride(periodId: string) {
    setForm((prev) => {
      const nextOverrides = { ...prev.periodAmountOverrides };
      delete nextOverrides[periodId];
      return { ...prev, periodAmountOverrides: nextOverrides };
    });
    invalidatePreview();
  }

  function handleAmbiguousCandidateSelection(candidate: AgreementAmendmentAmbiguousLineCandidate) {
    const matched = lineOptions.find((line) => line.id === candidate.sourceLineId);
    if (matched) {
      handleLineSelection(String(matched.id));
      return;
    }
    setAmbiguousCandidates([]);
    setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
  }

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit || agreementId == null) return;

    if (!canSubmitAgreementAmendmentReason(form.reason)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.reasonRequired'));
      return;
    }

    if (selectedLine && !isLineSelectableForAmendmentOperation(selectedLine, 'modify_line')) {
      const blockCode = resolveAgreementLineOperationBlockReasonCode(selectedLine, 'modify_line');
      const blockKey = blockCode ? agreementAmendmentReasonMessageKey(blockCode) : null;
      const blockLabel = blockKey ? t(blockKey) : null;
      setFormError(
        blockLabel && blockKey && blockLabel !== blockKey
          ? blockLabel
          : t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'),
      );
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
        setAmbiguousCandidates(readAmbiguousAgreementLineCandidates(res.error));
      }
      setFormError(resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t, res.error));
      return;
    }

    setAmbiguousCandidates([]);
    setPreview(normalizeAgreementAmendmentPreview(res.data));
    setPreviewReady(true);
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
      setFormError(resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t, res.error));
      setShowApplyConfirm(false);
      return;
    }

    toast.success(t('admin.student360.financeWorkspace.agreementAmendment.success'));
    resetAndClose();
    onSuccess();
  }

  if (!open) return null;

  const formReady = canSubmitAgreementAmendmentForm(form, selectedLine);

  return (
    <>
      <SetupDrawer
        open={open}
        title={t('admin.student360.financeWorkspace.agreementAmendment.title')}
        onClose={resetAndClose}
        size="wide"
      >
        <form
          ref={rootRef}
          className="student-finance-amendment-form stack"
          onSubmit={(event) => void handlePreview(event)}
        >
          <AgreementAmendmentLinePicker
            lines={lineOptions}
            selectedLineId={form.sourceLineId}
            currency={currency}
            operationType="modify_line"
            disabled={!canEdit || !lineOptions.length}
            onSelect={handleLineSelection}
          />

          {!lineOptions.length ? <p className="tiny muted">{copy.noServices}</p> : null}

          {selectedLine ? (
            <label className="student-finance-amendment-new-price">
              <span>{copy.newPrice}</span>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, amount: event.target.value }));
                  invalidatePreview();
                }}
                disabled={!canEdit}
                required
              />
            </label>
          ) : null}

          {selectedLine ? (
            <AgreementAmendmentSparsePeriodGrid
              periods={periodOptions}
              selectedPeriodIds={form.selectedPeriodIds}
              periodAmountOverrides={form.periodAmountOverrides}
              periodImpacts={preview?.periodImpacts ?? []}
              baseCurrentAmount={selectedLine.unitPrice ?? selectedLine.amount}
              currency={currency}
              loading={periodsLoading}
              disabled={!canEdit}
              onToggle={togglePeriod}
              onOverrideChange={updatePeriodOverride}
              onOverrideClear={clearPeriodOverride}
            />
          ) : null}

          {selectedLine && periodsError ? <p className="tiny muted">{periodsError}</p> : null}
          {selectedLine && !periodsLoading && !periodOptions.length && !periodsError ? (
            <p className="tiny muted">{copy.noPeriods}</p>
          ) : null}

          {selectedLine ? (
            <AgreementAmendmentReasonSelector
              value={form.reason}
              disabled={!canEdit}
              onChange={(reason) => {
                setForm((prev) => ({ ...prev, reason }));
                invalidatePreview();
              }}
            />
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

          <div className="row student-finance-amendment-form__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={previewLoading || !canEdit || !formReady}
            >
              {previewLoading ? t('common.loading') : t('admin.student360.financeWorkspace.agreementAmendment.preview')}
            </button>
            {previewReady && preview?.canApply ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={applyLoading}
                onClick={() => setShowApplyConfirm(true)}
              >
                {t('admin.student360.financeWorkspace.agreementAmendment.apply')}
              </button>
            ) : null}
          </div>
        </form>

        <AgreementAmendmentLivePreviewPanel
          form={form}
          selectedLine={selectedLine}
          periods={periodOptions}
          preview={preview}
          previewLoading={previewLoading}
          error={formError}
          currency={currency}
        />
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
