'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useFeeTypeOptions } from '@/features/admin/finance/use-finance-lookups';
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
  AgreementAmendmentOperationType,
  AgreementAmendmentPeriodOption,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
import {
  agreementAmendmentReasonMessageKey,
  resolveAgreementAmendmentErrorMessage,
} from '../utils/agreement-amendment-errors';
import {
  isLineSelectableForAmendmentOperation,
  resolveAvailableAmendmentPaths,
} from '../utils/agreement-amendment-path';
import { resolveAgreementLineOperationBlockReasonCode } from '../utils/agreement-amendment-line-eligibility';
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
import { resolveAgreementAmendmentBlockingMessage } from '../utils/resolve-agreement-amendment-warning';
import { AgreementAmendmentLinePicker } from './agreement-amendment-line-picker';
import { AgreementAmendmentMonthRail } from './agreement-amendment-month-rail';
import {
  reconcileSparsePeriodSelectionWithPreview,
  resolveAmendmentReasonPresetLabel,
} from './agreement-amendment-preview-model';
import { AgreementAmendmentReasonSelector } from './agreement-amendment-reason-selector';
import { AgreementAmendmentLivePreviewPanel } from './agreement-amendment-live-preview-panel';
import { AgreementAmendmentSparsePeriodGrid } from './agreement-amendment-sparse-period-grid';
import { useAgreementAmendmentAutoPreview } from './use-agreement-amendment-auto-preview';
import './agreement-amendment-studio.css';
import './agreement-amendment-feedback.css';

const COPY = {
  ar: {
    modify: 'تعديل خدمة',
    serviceDuration: 'مدة الاستفادة من الخدمة',
    durationDescription: 'حدد الأشهر التي ستستمر فيها هذه الخدمة. الأشهر المرتبطة بأداء أو حركة مالية مؤكدة تبقى محمية.',
    noChanges: 'لا توجد تغييرات على الخدمة.',
    combinedChangeBlocked: 'غيّر السعر أو مدة الاستفادة في عملية واحدة، ثم نفّذ التغيير الآخر بعد نجاح الأولى.',
    add: 'إضافة خدمة',
    remove: 'إزالة خدمة',
    service: 'الخدمة',
    newPrice: 'السعر الجديد',
    price: 'السعر',
    effectiveFrom: 'ابتداءً من شهر',
    noModifyServices: 'لا توجد خدمات قابلة للتعديل.',
    noRemoveServices: 'لا توجد خدمات قابلة للإزالة.',
    noPeriods: 'لا توجد أشهر قابلة للتعديل.',
    noAmendablePeriods: 'لا توجد أشهر صالحة للتعديل لهذه الخدمة.',
    previewPending: 'تتحدث المعاينة تلقائيًا، ويمكنك تحديثها يدويًا أيضًا.',
    applyBlocked: 'سبب عدم الجاهزية:',
  },
  fr: {
    modify: 'Modifier un service',
    serviceDuration: 'Durée du service',
    durationDescription: 'Sélectionnez les mois pendant lesquels le service reste actif. Les mois liés à un paiement ou à une opération financière confirmée restent protégés.',
    noChanges: 'Aucune modification du service.',
    combinedChangeBlocked: 'Modifiez le prix ou la durée en une seule opération, puis appliquez l’autre changement après la première.',
    add: 'Ajouter un service',
    remove: 'Retirer un service',
    service: 'Service',
    newPrice: 'Nouveau prix',
    price: 'Prix',
    effectiveFrom: 'À partir du mois',
    noModifyServices: 'Aucun service modifiable.',
    noRemoveServices: 'Aucun service retirable.',
    noPeriods: 'Aucun mois modifiable.',
    noAmendablePeriods: 'Aucun mois ne peut être modifié pour ce service.',
    previewPending: 'L’aperçu se met à jour automatiquement et peut aussi être actualisé manuellement.',
    applyBlocked: 'Motif du blocage :',
  },
  en: {
    modify: 'Modify service',
    serviceDuration: 'Service duration',
    durationDescription: 'Select the months during which this service remains active. Months tied to confirmed payments or financial activity remain protected.',
    noChanges: 'There are no service changes.',
    combinedChangeBlocked: 'Change either the price or the service duration in one operation, then apply the other change afterwards.',
    add: 'Add service',
    remove: 'Remove service',
    service: 'Service',
    newPrice: 'New price',
    price: 'Price',
    effectiveFrom: 'Starting month',
    noModifyServices: 'No service can be amended.',
    noRemoveServices: 'No service can be removed.',
    noPeriods: 'No amendable months are available.',
    noAmendablePeriods: 'No months can be amended for this service.',
    previewPending: 'The preview updates automatically and can also be refreshed manually.',
    applyBlocked: 'Why this is not ready:',
  },
  es: {
    modify: 'Modificar servicio',
    serviceDuration: 'Duración del servicio',
    durationDescription: 'Seleccione los meses durante los que el servicio seguirá activo. Los meses vinculados a pagos o movimientos financieros confirmados permanecen protegidos.',
    noChanges: 'No hay cambios en el servicio.',
    combinedChangeBlocked: 'Cambie el precio o la duración en una sola operación y aplique el otro cambio después.',
    add: 'Añadir servicio',
    remove: 'Eliminar servicio',
    service: 'Servicio',
    newPrice: 'Nuevo precio',
    price: 'Precio',
    effectiveFrom: 'Desde el mes',
    noModifyServices: 'No hay servicios modificables.',
    noRemoveServices: 'No hay servicios eliminables.',
    noPeriods: 'No hay meses modificables.',
    noAmendablePeriods: 'No hay meses modificables para este servicio.',
    previewPending: 'La vista previa se actualiza automáticamente y también puede actualizarse manualmente.',
    applyBlocked: 'Motivo del bloqueo:',
  },
} as const;

type SparseAgreementAmendmentFormState = AgreementAmendmentFormState & {
  selectedPeriodIds: string[];
  periodAmountOverrides: Record<string, string>;
};

function resolveCurrentIncludedPeriodIds(
  agreement: FinancialAgreement | null | undefined,
  agreementLineId: number | null | undefined,
  periods: AgreementAmendmentPeriodOption[],
): string[] {
  if (!agreementLineId) return [];
  const scheduled = (agreement?.installments ?? []).filter((item) => {
    const state = String(item.state ?? '').toLowerCase();
    return (
      item.agreement_line_id === agreementLineId &&
      state !== 'cancelled' &&
      state !== 'waived'
    );
  });
  return periods
    .filter((period) =>
      scheduled.some(
        (item) =>
          Boolean(period.periodStart && period.periodEnd) &&
          item.period_start === period.periodStart &&
          item.period_end === period.periodEnd,
      ),
    )
    .map((period) => String(period.id));
}

function samePeriodSelection(a: string[], b: string[]): boolean {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function defaultForm(locale: string): SparseAgreementAmendmentFormState {
  return {
    operationType: 'modify_line',
    amendmentPath: 'period_range',
    effectivePeriodId: '',
    effectivePeriodEndId: '',
    selectedPeriodIds: [],
    periodAmountOverrides: {},
    reason: resolveAmendmentReasonPresetLabel(locale, 'manager_decision'),
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
  const { feeTypes, loading: feeTypesLoading } = useFeeTypeOptions();
  const { rootRef } = useAgreementAmendmentAutoPreview<HTMLFormElement>();
  const previewRequestSeqRef = useRef(0);
  const [form, setForm] = useState<SparseAgreementAmendmentFormState>(() => defaultForm(locale));
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
  const [blockedPeriodIds, setBlockedPeriodIds] = useState<string[]>([]);

  const agreementId = agreement?.id ?? null;
  const canEdit = workspaceAllowed === true && agreementId != null;
  const currency = agreementDetails?.currency?.name ?? agreement?.currency?.name ?? null;

  const allLineOptions = useMemo(
    () => resolveAmendmentAgreementLineOptions(agreementDetails ?? agreement),
    [agreement, agreementDetails],
  );
  const lineOptions = allLineOptions;
  const hasSelectableLines = useMemo(
    () =>
      form.operationType === 'add_line' ||
      lineOptions.some((line) =>
        isLineSelectableForAmendmentOperation(line, form.operationType),
      ),
    [form.operationType, lineOptions],
  );
  const periodOptions = useMemo(
    () => resolveAmendmentEffectivePeriodOptions({
      fetchedPeriods,
      previewOpenPeriods: preview?.openPeriods,
    }),
    [fetchedPeriods, preview?.openPeriods],
  );
  const modifyPeriodOptions = useMemo(() => {
    if (!blockedPeriodIds.length) return periodOptions;
    const blocked = new Set(blockedPeriodIds);
    return periodOptions.map((period) =>
      blocked.has(String(period.id)) ? { ...period, selectable: false } : period,
    );
  }, [blockedPeriodIds, periodOptions]);
  const selectedLine = useMemo(() => {
    if (!form.sourceLineId) return null;
    return lineOptions.find((line) => String(line.id) === form.sourceLineId) ?? null;
  }, [form.sourceLineId, lineOptions]);
  const selectedFeeType = useMemo(
    () => feeTypes.find((feeType) => String(feeType.id) === form.feeTypeId) ?? null,
    [feeTypes, form.feeTypeId],
  );
  const serviceLabel = selectedLine?.label ?? selectedFeeType?.name ?? null;

  useEffect(() => {
    if (!open) return;
    previewRequestSeqRef.current += 1;
    setForm(defaultForm(locale));
    setPreview(null);
    setPreviewReady(false);
    setPreviewLoading(false);
    setFormError(null);
    setShowApplyConfirm(false);
    setAgreementDetails(agreement);
    setFetchedPeriods([]);
    setPeriodsError(null);
    setPeriodSelectionInitializedLineId(null);
    setAmbiguousCandidates([]);
    setBlockedPeriodIds([]);
  }, [open, agreementId, agreement, locale]);

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
    if (
      form.operationType !== 'modify_line' ||
      form.amendmentPath !== 'period_range' ||
      selectedLine?.isMonthly !== true
    ) {
      return;
    }
    if (!form.sourceLineId || !modifyPeriodOptions.length) return;
    const initializationKey = `modify_line:${form.sourceLineId}`;
    if (periodSelectionInitializedLineId === initializationKey) return;
    const selectedPeriodIds = resolveCurrentIncludedPeriodIds(
      agreementDetails ?? agreement,
      selectedLine?.agreementLineId ?? selectedLine?.sourceLineId,
      modifyPeriodOptions,
    );
    setForm((prev) => ({
      ...prev,
      selectedPeriodIds,
      periodAmountOverrides: {},
    }));
    setPeriodSelectionInitializedLineId(initializationKey);
    setPreview(null);
    setPreviewReady(false);
  }, [
    form.operationType,
    form.amendmentPath,
    form.sourceLineId,
    modifyPeriodOptions,
    periodSelectionInitializedLineId,
    agreementDetails,
    agreement,
    selectedLine,
  ]);

  function resetAndClose() {
    previewRequestSeqRef.current += 1;
    setForm(defaultForm(locale));
    setPreview(null);
    setPreviewReady(false);
    setPreviewLoading(false);
    setFormError(null);
    setShowApplyConfirm(false);
    setPeriodSelectionInitializedLineId(null);
    setBlockedPeriodIds([]);
    onClose();
  }

  function invalidatePreview() {
    previewRequestSeqRef.current += 1;
    setPreview(null);
    setPreviewReady(false);
    setPreviewLoading(false);
    setFormError(null);
  }

  function updateOperationType(operationType: AgreementAmendmentOperationType) {
    setPeriodSelectionInitializedLineId(null);
    setAmbiguousCandidates([]);
    setBlockedPeriodIds([]);
    setForm((prev) => ({
      ...prev,
      operationType,
      amendmentPath:
        operationType === 'modify_line' || operationType === 'cancel_line' ? 'period_range' : '',
      sourceLineId: '',
      feeTypeId: '',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      selectedPeriodIds: [],
      periodAmountOverrides: {},
      amount: operationType === 'cancel_line' ? '0' : '',
    }));
    invalidatePreview();
  }

  function handleLineSelection(sourceLineId: string) {
    const selected = lineOptions.find((line) => String(line.id) === sourceLineId);
    const availablePaths = resolveAvailableAmendmentPaths(selected, form.operationType);
    const amendmentPath =
      form.operationType === 'cancel_line'
        ? 'period_range'
        : availablePaths.includes('period_range')
          ? 'period_range'
          : availablePaths.includes('adjust_amount')
            ? 'adjust_amount'
            : '';
    setAmbiguousCandidates([]);
    setPeriodSelectionInitializedLineId(null);
    setBlockedPeriodIds([]);
    setForm((prev) => ({
      ...prev,
      amendmentPath,
      sourceLineId,
      feeTypeId: selected?.feeTypeId != null ? String(selected.feeTypeId) : '',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      selectedPeriodIds: [],
      periodAmountOverrides: {},
      amount:
        prev.operationType === 'cancel_line'
          ? '0'
          : selected?.unitPrice != null
            ? String(selected.unitPrice)
            : selected?.amount != null
              ? String(selected.amount)
              : '',
    }));
    invalidatePreview();
  }

  function selectEffectiveMonth(periodId: string) {
    setForm((prev) => ({
      ...prev,
      effectivePeriodId: periodId,
      effectivePeriodEndId: '',
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

  function resolveExecutionForm(
    candidateForm: SparseAgreementAmendmentFormState,
    candidateLine = candidateForm.sourceLineId
      ? allLineOptions.find((line) => String(line.id) === candidateForm.sourceLineId) ?? null
      : null,
  ): { form: SparseAgreementAmendmentFormState | null; error: string | null } {
    if (!candidateLine) return { form: candidateForm, error: null };

    if (candidateForm.operationType === 'cancel_line') {
      const firstPeriodId = periodOptions[0]?.id != null ? String(periodOptions[0].id) : '';
      return {
        form: {
          ...candidateForm,
          effectivePeriodId: firstPeriodId,
          effectivePeriodEndId: '',
          selectedPeriodIds: [],
          periodAmountOverrides: {},
        },
        error: firstPeriodId ? null : copy.noPeriods,
      };
    }

    if (
      candidateForm.operationType === 'modify_line' &&
      candidateForm.amendmentPath === 'period_range' &&
      candidateLine.isMonthly === true
    ) {
      const currentPeriodIds = resolveCurrentIncludedPeriodIds(
        agreementDetails ?? agreement,
        candidateLine.agreementLineId ?? candidateLine.sourceLineId,
        modifyPeriodOptions,
      );
      const periodsChanged = !samePeriodSelection(candidateForm.selectedPeriodIds, currentPeriodIds);
      const currentAmount = candidateLine.unitPrice ?? candidateLine.amount;
      const nextAmount = Number(candidateForm.amount);
      const priceChanged =
        candidateForm.amount.trim() !== '' &&
        Number.isFinite(nextAmount) &&
        (currentAmount == null || Math.abs(nextAmount - Number(currentAmount)) > 0.0001);

      if (periodsChanged && priceChanged) {
        return { form: null, error: copy.combinedChangeBlocked };
      }

      if (periodsChanged) {
        return {
          form: {
            ...candidateForm,
            operationType: 'reconcile_periods',
            amount: '',
            effectivePeriodId: '',
            effectivePeriodEndId: '',
            periodAmountOverrides: {},
          },
          error: null,
        };
      }

      if (priceChanged) {
        const firstPeriodId =
          currentPeriodIds[0] ??
          (modifyPeriodOptions[0]?.id != null ? String(modifyPeriodOptions[0].id) : '');
        return {
          form: {
            ...candidateForm,
            operationType: 'modify_line',
            selectedPeriodIds: [],
            periodAmountOverrides: {},
            effectivePeriodId: firstPeriodId,
            effectivePeriodEndId: '',
          },
          error: firstPeriodId ? null : copy.noPeriods,
        };
      }

      return { form: null, error: copy.noChanges };
    }

    return { form: candidateForm, error: null };
  }

  async function requestPreview(
    candidateForm: SparseAgreementAmendmentFormState,
    allowSparseReconcile = true,
  ): Promise<void> {
    if (!canEdit || agreementId == null) return;

    const candidateLine = candidateForm.sourceLineId
      ? allLineOptions.find((line) => String(line.id) === candidateForm.sourceLineId) ?? null
      : null;
    const execution = resolveExecutionForm(candidateForm, candidateLine);
    if (!execution.form) {
      setFormError(execution.error ?? t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
      return;
    }
    const executionForm = execution.form;

    if (!canSubmitAgreementAmendmentReason(executionForm.reason)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.reasonRequired'));
      return;
    }

    if (
      executionForm.operationType !== 'add_line' &&
      candidateLine &&
      !isLineSelectableForAmendmentOperation(candidateLine, executionForm.operationType)
    ) {
      const blockCode = resolveAgreementLineOperationBlockReasonCode(
        candidateLine,
        executionForm.operationType,
      );
      const blockKey = blockCode ? agreementAmendmentReasonMessageKey(blockCode) : null;
      const blockLabel = blockKey ? t(blockKey) : null;
      setFormError(
        blockLabel && blockKey && blockLabel !== blockKey
          ? blockLabel
          : t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'),
      );
      return;
    }

    if (!canSubmitAgreementAmendmentForm(executionForm, candidateLine)) {
      setFormError(t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
      return;
    }

    const requestId = ++previewRequestSeqRef.current;
    setPreviewLoading(true);
    setFormError(null);
    setPreview(null);
    setPreviewReady(false);

    const payload = buildAgreementAmendmentPreviewPayload(agreementId, executionForm, candidateLine);
    const prepared = await prepareAgreementAmendmentPayload(studentId, payload);
    if (requestId !== previewRequestSeqRef.current) return;
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
    if (requestId !== previewRequestSeqRef.current) return;
    if (!res.success) {
      setPreviewLoading(false);
      if (isAmbiguousAgreementLineTargetError(res.error?.code)) {
        setAmbiguousCandidates(readAmbiguousAgreementLineCandidates(res.error));
      }
      setFormError(resolveAgreementAmendmentErrorMessage(res.error?.code, res.error?.message, t, res.error));
      return;
    }

    setAmbiguousCandidates([]);
    const normalized = normalizeAgreementAmendmentPreview(res.data);
    const periodImpacts = normalized.periodImpacts ?? [];

    if (
      allowSparseReconcile &&
      candidateForm.operationType === 'modify_line' &&
      candidateForm.amendmentPath === 'period_range' &&
      periodImpacts.length
    ) {
      const reconciled = reconcileSparsePeriodSelectionWithPreview({
        selectedPeriodIds: executionForm.selectedPeriodIds,
        periodAmountOverrides: executionForm.periodAmountOverrides,
        periodImpacts,
      });

      if (reconciled.changed) {
        setBlockedPeriodIds((current) => [
          ...new Set([...current, ...reconciled.blockedPeriodIds]),
        ]);
        const nextForm: SparseAgreementAmendmentFormState = {
          ...executionForm,
          selectedPeriodIds: reconciled.selectedPeriodIds,
          periodAmountOverrides: reconciled.periodAmountOverrides,
        };
        setForm(nextForm);

        if (!reconciled.selectedPeriodIds.length) {
          setPreview(normalized);
          setPreviewReady(true);
          setPreviewLoading(false);
          setFormError(copy.noAmendablePeriods);
          return;
        }

        await requestPreview(nextForm, false);
        return;
      }
    }

    setPreview(normalized);
    setPreviewReady(true);
    setPreviewLoading(false);
  }

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault();
    await requestPreview(form, true);
  }

  async function handleApplyConfirmed() {
    if (!previewReady || !preview?.canApply || agreementId == null) return;
    const execution = resolveExecutionForm(form, selectedLine);
    if (!execution.form || !canSubmitAgreementAmendmentForm(execution.form, selectedLine)) {
      setFormError(execution.error ?? t('admin.student360.financeWorkspace.agreementAmendment.errors.formIncomplete'));
      setShowApplyConfirm(false);
      return;
    }

    setApplyLoading(true);
    const payload = buildAgreementAmendmentApplyPayload(agreementId, execution.form, selectedLine);
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

  const executionState = resolveExecutionForm(form, selectedLine);
  const formReady =
    executionState.form != null &&
    canSubmitAgreementAmendmentForm(executionState.form, selectedLine);
  const applyReady =
    previewReady && preview?.canApply === true && preview.alreadyAligned !== true && formReady;
  const applyBlockMessage =
    previewReady && preview && !preview.canApply && preview.blockingReasons.length
      ? resolveAgreementAmendmentBlockingMessage(preview.blockingReasons[0]!, t)
      : null;
  const periodControlsActive =
    form.operationType === 'add_line' ||
    (form.operationType === 'modify_line' &&
      form.amendmentPath === 'period_range' &&
      selectedLine?.isMonthly === true);
  const visiblePeriods = periodControlsActive
    ? form.operationType === 'modify_line'
      ? modifyPeriodOptions
      : periodOptions
    : [];

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
          <fieldset className="student-finance-amendment-operation-selector">
            <div className="student-finance-amendment-operation-selector__options">
              {([
                ['modify_line', copy.modify],
                ['add_line', copy.add],
                ['cancel_line', copy.remove],
              ] as const).map(([operationType, label]) => (
                <label key={operationType} className="student-finance-amendment-operation-selector__option">
                  <input
                    type="radio"
                    name="agreementAmendmentOperation"
                    checked={form.operationType === operationType}
                    onChange={() => updateOperationType(operationType)}
                    disabled={!canEdit}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.operationType === 'add_line' ? (
            <label className="student-finance-amendment-service-select">
              <span>{copy.service}</span>
              <select
                className="input"
                value={form.feeTypeId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, feeTypeId: event.target.value }));
                  invalidatePreview();
                }}
                disabled={!canEdit || feeTypesLoading}
                required
              >
                <option value="">{t('common.dash')}</option>
                {feeTypes.map((feeType) => (
                  <option key={feeType.id} value={feeType.id}>
                    {feeType.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <AgreementAmendmentLinePicker
                lines={lineOptions}
                selectedLineId={form.sourceLineId}
                currency={currency}
                operationType={form.operationType}
                disabled={!canEdit || !hasSelectableLines}
                onSelect={handleLineSelection}
              />
              {!hasSelectableLines ? (
                <p className="tiny muted">
                  {form.operationType === 'cancel_line' ? copy.noRemoveServices : copy.noModifyServices}
                </p>
              ) : null}
            </>
          )}

          <AgreementAmendmentReasonSelector
            value={form.reason}
            disabled={!canEdit}
            onChange={(reason) => {
              setForm((prev) => ({ ...prev, reason }));
              invalidatePreview();
            }}
          />

          {form.operationType !== 'cancel_line' &&
          (form.operationType === 'add_line' || selectedLine) ? (
            <label className="student-finance-amendment-new-price">
              <span>{form.operationType === 'modify_line' ? copy.newPrice : copy.price}</span>
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

          {form.operationType === 'modify_line' &&
          form.amendmentPath === 'period_range' &&
          selectedLine?.isMonthly === true ? (
            <section className="student-finance-amendment-duration">
              <span>{copy.serviceDuration}</span>
              <p className="tiny muted">{copy.durationDescription}</p>
              <AgreementAmendmentSparsePeriodGrid
              periods={modifyPeriodOptions}
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
              mode="included"
            />
            </section>
          ) : null}

          {form.operationType === 'add_line' ? (
            <section className="student-finance-amendment-effective-month">
              <span>{copy.effectiveFrom}</span>
              <AgreementAmendmentMonthRail
                periods={periodOptions}
                selectedPeriodId={form.effectivePeriodId}
                loading={periodsLoading}
                disabled={!canEdit}
                onSelect={selectEffectiveMonth}
              />
            </section>
          ) : null}

          {periodControlsActive &&
          (form.operationType === 'modify_line'
            ? selectedLine
            : form.operationType === 'add_line' || selectedLine) &&
          periodsError ? (
            <p className="tiny muted">{periodsError}</p>
          ) : null}
          {periodControlsActive && !periodsLoading && !visiblePeriods.length && !periodsError ? (
            <p className="tiny muted">{copy.noPeriods}</p>
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

          {previewReady && preview?.alreadyAligned === true ? (
            <p className="tiny muted">{copy.noChanges}</p>
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="student-finance-amendment-form__action-note tiny muted">
            {copy.previewPending}
          </div>
          <div className="row student-finance-amendment-form__actions">
            <button
              type="submit"
              className="btn btn--ghost"
              disabled={previewLoading || !canEdit || !formReady}
            >
              {previewLoading ? t('common.loading') : t('admin.student360.financeWorkspace.agreementAmendment.preview')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={applyLoading || previewLoading || !applyReady}
              onClick={() => setShowApplyConfirm(true)}
            >
              {t('admin.student360.financeWorkspace.agreementAmendment.apply')}
            </button>
          </div>
          {applyBlockMessage ? (
            <p className="tiny muted" role="status">
              <strong>{copy.applyBlocked}</strong> {applyBlockMessage}
            </p>
          ) : null}
        </form>

        <AgreementAmendmentLivePreviewPanel
          form={form}
          selectedLine={selectedLine}
          serviceLabel={serviceLabel}
          periods={visiblePeriods}
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
