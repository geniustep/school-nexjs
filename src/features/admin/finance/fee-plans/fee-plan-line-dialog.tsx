'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import { isPositiveAmount } from '@/lib/utils/finance';
import { FeeTypeQuickCreateDialog } from '@/features/admin/finance/fee-types/fee-type-quick-create-dialog';
import { FEE_TYPE_FREQUENCIES } from '@/features/admin/finance/fee-types/fee-type-options';
import type { FeeType } from '@/types/finance';
import { FeePlanInstallmentEditor } from './fee-plan-installment-editor';
import { FeePlanLineLevelSelector } from './fee-plan-line-level-selector';
import {
  computeDraftInstallmentAmount,
  computeDraftLineExpectedTotal,
  draftAmountFieldLabelKey,
  draftAmountHintKey,
  inferDefaultPricingMode,
  validateDraftLinePricing,
} from './fee-plan-pricing';
import {
  installmentScheduleTotal,
  roundMoney,
  suggestEqualInstallments,
} from './fee-plan-payload';
import type { DraftFeePlanLine, FeePlanScheduleMode } from './fee-plan-types';
import type { FeePlanPricingMode } from '@/types/finance';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';

const CREATE_NEW_VALUE = '__create_fee_type__';

export function FeePlanLineDialog({
  open,
  line,
  feeTypes,
  planLevelIds,
  scopeGroups,
  onSave,
  onClose,
  onFeeTypeCreated,
}: {
  open: boolean;
  line: DraftFeePlanLine | null;
  feeTypes: FeeType[];
  planLevelIds: number[];
  scopeGroups: FeePlanScopeCycleGroup[];
  onSave: (line: DraftFeePlanLine) => void;
  onClose: () => void;
  onFeeTypeCreated: (feeType: FeeType) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<DraftFeePlanLine | null>(line);
  const [error, setError] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(line);
      setError(null);
    }
  }, [open, line]);

  const scheduleMismatch = useMemo(() => {
    if (!draft || draft.scheduleMode !== 'explicit' || draft.installmentCount <= 1) return false;
    return roundMoney(installmentScheduleTotal(draft.installmentSchedule)) !== roundMoney(computeDraftLineExpectedTotal(draft));
  }, [draft]);

  const draftPricing = useMemo(() => {
    if (!draft) return null;
    return {
      expectedTotal: computeDraftLineExpectedTotal(draft),
      installmentAmount: computeDraftInstallmentAmount(draft),
    };
  }, [draft]);

  const showPricingModeChoice =
    draft != null &&
    draft.frequency !== 'once' &&
    draft.frequency !== 'one_time' &&
    draft.installmentCount > 1;

  const frequencyOptions = useMemo(
    () =>
      FEE_TYPE_FREQUENCIES.map((value) => ({
        value,
        label: t(`admin.finance.feeTypesWorkspace.frequencies.${value}`),
      })),
    [t],
  );

  if (!open || !draft) return null;

  function update<K extends keyof DraftFeePlanLine>(key: K, value: DraftFeePlanLine[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleInstallmentCountChange(raw: string) {
    const count = Math.max(1, Number(raw) || 1);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, installmentCount: count };
      if (count <= 1) {
        next.scheduleMode = 'on_assignment';
        next.installmentSchedule = [];
      } else if (prev.scheduleMode === 'explicit') {
        next.installmentSchedule = suggestEqualInstallments(
          computeDraftLineExpectedTotal(next),
          count,
          prev.dueDate || undefined,
        );
      }
      return next;
    });
  }

  function handleScheduleModeChange(mode: FeePlanScheduleMode) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, scheduleMode: mode };
      if (mode === 'explicit' && prev.installmentCount > 1) {
        next.installmentSchedule = suggestEqualInstallments(
          computeDraftLineExpectedTotal(next),
          prev.installmentCount,
          prev.dueDate || undefined,
        );
      }
      return next;
    });
  }

  function handleSave() {
    if (!draft) return;
    if (!draft.feeTypeId) {
      setError(t('admin.finance.feePlansWorkspace.errors.lineFeeTypeRequired'));
      return;
    }
    if (!isPositiveAmount(draft.amount)) {
      setError(t('admin.finance.feePlansWorkspace.errors.lineAmountRequired'));
      return;
    }
    if (draft.levelScopeMode === 'specific' && !draft.levelIds.length) {
      setError(t('admin.finance.feePlansWorkspace.errors.lineLevelRequired'));
      return;
    }
    if (draft.scheduleMode === 'explicit' && draft.installmentCount > 1 && scheduleMismatch) {
      setError(t('admin.finance.feePlansWorkspace.errors.scheduleMismatch'));
      return;
    }
    const pricingError = validateDraftLinePricing(draft);
    if (pricingError) {
      setError(t(pricingError));
      return;
    }
    if (draft.frequency === 'once' && draft.installmentCount > 1) {
      setError(t('admin.finance.feePlansWorkspace.errors.oneTimeMultiInstallment'));
      return;
    }
    onSave(draft);
    onClose();
  }

  const selectedType = feeTypes.find((ft) => ft.id === draft.feeTypeId);

  return (
    <>
      <ConfirmationDialog
        open={open}
        size="wide"
        closeOnBackdrop={false}
        title={
          line?.feeTypeId
            ? t('admin.finance.feePlansWorkspace.editLine')
            : t('admin.finance.feePlansWorkspace.addLine')
        }
        body={
          <div className="fee-plan-line-dialog form-stack">
            {error && <p className="form-error">{error}</p>}
            <label>
              {t('admin.finance.feeTypeName')}
              <select
                className="input"
                value={draft.feeTypeId || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === CREATE_NEW_VALUE) {
                    setQuickCreateOpen(true);
                    return;
                  }
                  const id = Number(raw);
                  const ft = feeTypes.find((f) => f.id === id);
                  update('feeTypeId', id);
                  if (ft && !draft.label.trim()) update('label', ft.name);
                }}
              >
                <option value="">{t('admin.finance.selectFeeType')}</option>
                {feeTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
                <option value={CREATE_NEW_VALUE}>{t('admin.finance.feePlansWorkspace.createFeeTypeInline')}</option>
              </select>
            </label>
            <label>
              {t('admin.finance.feePlansWorkspace.lineLabel')}
              <input
                className="input"
                value={draft.label}
                onChange={(e) => update('label', e.target.value)}
                placeholder={selectedType?.name ?? ''}
              />
              <span className="tiny muted">{t('admin.finance.feePlansWorkspace.lineLabelHint')}</span>
            </label>
            <label>
              {t(draftAmountFieldLabelKey(draft))}
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={draft.amount || ''}
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, amount };
                    if (prev.scheduleMode === 'explicit' && prev.installmentCount > 1) {
                      next.installmentSchedule = suggestEqualInstallments(
                        computeDraftLineExpectedTotal({ ...next, amount }),
                        prev.installmentCount,
                        prev.dueDate || undefined,
                      );
                    }
                    return next;
                  });
                }}
              />
              <span className="tiny muted">{t(draftAmountHintKey(draft))}</span>
            </label>
            <label>
              {t('admin.finance.feeTypesWorkspace.frequency')}
              <select
                className="input"
                value={draft.frequency}
                onChange={(e) => {
                  const frequency = e.target.value;
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      frequency,
                      pricingMode: inferDefaultPricingMode(frequency),
                    };
                    if (frequency === 'once') {
                      next.installmentCount = 1;
                      next.scheduleMode = 'on_assignment';
                      next.installmentSchedule = [];
                      next.pricingMode = 'total_amount_installments';
                    }
                    return next;
                  });
                }}
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {showPricingModeChoice ? (
              <label>
                {t('admin.finance.feePlansWorkspace.pricing.modeLabel')}
                <select
                  className="input"
                  value={draft.pricingMode ?? inferDefaultPricingMode(draft.frequency)}
                  onChange={(e) => {
                    const pricingMode = e.target.value as FeePlanPricingMode;
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = { ...prev, pricingMode };
                      if (prev.scheduleMode === 'explicit' && prev.installmentCount > 1) {
                        next.installmentSchedule = suggestEqualInstallments(
                          computeDraftLineExpectedTotal(next),
                          prev.installmentCount,
                          prev.dueDate || undefined,
                        );
                      }
                      return next;
                    });
                  }}
                >
                  <option value="recurring_unit_price">
                    {t('admin.finance.feePlansWorkspace.pricing.recurringOption')}
                  </option>
                  <option value="total_amount_installments">
                    {t('admin.finance.feePlansWorkspace.pricing.installmentTotalOption')}
                  </option>
                </select>
              </label>
            ) : null}
            <FeePlanLineLevelSelector
              planLevelIds={planLevelIds}
              scopeGroups={scopeGroups}
              mode={draft.levelScopeMode}
              selectedLevelIds={draft.levelIds}
              onModeChange={(mode) => update('levelScopeMode', mode)}
              onLevelIdsChange={(ids) => update('levelIds', ids)}
            />
            <label className="fee-plan-line-dialog__optional">
              <input
                type="checkbox"
                checked={draft.isOptional}
                onChange={(e) => update('isOptional', e.target.checked)}
              />
              <span>
                <strong>{t('admin.finance.feePlansWorkspace.optionalService')}</strong>
                <span className="muted">{t('admin.finance.feePlansWorkspace.optionalServiceHint')}</span>
              </span>
            </label>
            <label>
              {t('admin.finance.feePlansWorkspace.installmentCount')}
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={draft.installmentCount}
                onChange={(e) => handleInstallmentCountChange(e.target.value)}
              />
            </label>
            {draftPricing && draft.installmentCount > 1 ? (
              <div className="fee-plan-line-dialog__pricing-preview">
                <p className="tiny muted">
                  {t('admin.finance.feePlansWorkspace.pricing.expectedInstallment')}:{' '}
                  <strong className="mono">{draftPricing.installmentAmount ?? '—'}</strong>
                </p>
                <p className="tiny muted">
                  {t('admin.finance.feePlansWorkspace.pricing.expectedTotal')}:{' '}
                  <strong className="mono">{draftPricing.expectedTotal}</strong>
                </p>
              </div>
            ) : null}
            {draft.installmentCount > 1 && (
              <>
                <label>
                  {t('admin.finance.feePlansWorkspace.scheduleMode')}
                  <select
                    className="input"
                    value={draft.scheduleMode}
                    onChange={(e) => handleScheduleModeChange(e.target.value as FeePlanScheduleMode)}
                  >
                    <option value="on_assignment">
                      {t('admin.finance.feePlansWorkspace.scheduleOnAssignment')}
                    </option>
                    <option value="fixed_date">
                      {t('admin.finance.feePlansWorkspace.scheduleFixedDate')}
                    </option>
                    <option value="explicit">
                      {t('admin.finance.feePlansWorkspace.scheduleExplicit')}
                    </option>
                  </select>
                </label>
                {draft.scheduleMode === 'fixed_date' && (
                  <label>
                    {t('admin.finance.dueDate')}
                    <input
                      className="input"
                      type="date"
                      value={draft.dueDate}
                      onChange={(e) => update('dueDate', e.target.value)}
                    />
                  </label>
                )}
                {draft.scheduleMode === 'explicit' && (
                  <>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        update(
                          'installmentSchedule',
                          suggestEqualInstallments(
                            computeDraftLineExpectedTotal(draft),
                            draft.installmentCount,
                            draft.dueDate || undefined,
                          ),
                        )
                      }
                    >
                      {t('admin.finance.feePlansWorkspace.distributeEvenly')}
                    </button>
                    <FeePlanInstallmentEditor
                      amount={computeDraftLineExpectedTotal(draft)}
                      schedule={draft.installmentSchedule}
                      onChange={(schedule) => update('installmentSchedule', schedule)}
                      error={
                        scheduleMismatch
                          ? t('admin.finance.feePlansWorkspace.errors.scheduleMismatch')
                          : null
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
        }
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleSave}
        onClose={onClose}
      />
      <FeeTypeQuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(feeType) => {
          onFeeTypeCreated(feeType);
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  feeTypeId: feeType.id,
                  label: prev.label.trim() ? prev.label : feeType.name,
                }
              : prev,
          );
        }}
      />
    </>
  );
}
