'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import { isPositiveAmount } from '@/lib/utils/finance';
import type { FeeType } from '@/types/finance';
import { FeePlanInstallmentEditor } from './fee-plan-installment-editor';
import {
  installmentScheduleTotal,
  roundMoney,
  suggestEqualInstallments,
} from './fee-plan-payload';
import type { DraftFeePlanLine, FeePlanScheduleMode } from './fee-plan-types';

export function FeePlanLineDialog({
  open,
  line,
  feeTypes,
  onSave,
  onClose,
}: {
  open: boolean;
  line: DraftFeePlanLine | null;
  feeTypes: FeeType[];
  onSave: (line: DraftFeePlanLine) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<DraftFeePlanLine | null>(line);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(line);
      setError(null);
    }
  }, [open, line]);

  const scheduleMismatch = useMemo(() => {
    if (!draft || draft.scheduleMode !== 'explicit' || draft.installmentCount <= 1) return false;
    return roundMoney(installmentScheduleTotal(draft.installmentSchedule)) !== roundMoney(draft.amount);
  }, [draft]);

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
        next.installmentSchedule = suggestEqualInstallments(prev.amount, count, prev.dueDate || undefined);
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
          prev.amount,
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
    if (draft.scheduleMode === 'explicit' && draft.installmentCount > 1 && scheduleMismatch) {
      setError(t('admin.finance.feePlansWorkspace.errors.scheduleMismatch'));
      return;
    }
    onSave(draft);
    onClose();
  }

  const selectedType = feeTypes.find((ft) => ft.id === draft.feeTypeId);

  return (
    <ConfirmationDialog
      open={open}
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
                const id = Number(e.target.value);
                const ft = feeTypes.find((f) => f.id === id);
                update('feeTypeId', id);
                if (ft && !draft.label.trim()) update('label', ft.name);
              }}
            >
              <option value="">{t('admin.finance.selectFeeType')}</option>
              {feeTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.name} ({ft.code})
                </option>
              ))}
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
          </label>
          <label>
            {t('admin.finance.lineAmount')}
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amount || ''}
              onChange={(e) => {
                const amount = Number(e.target.value);
                update('amount', amount);
                if (draft.scheduleMode === 'explicit' && draft.installmentCount > 1) {
                  update(
                    'installmentSchedule',
                    suggestEqualInstallments(amount, draft.installmentCount, draft.dueDate || undefined),
                  );
                }
              }}
            />
          </label>
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
                          draft.amount,
                          draft.installmentCount,
                          draft.dueDate || undefined,
                        ),
                      )
                    }
                  >
                    {t('admin.finance.feePlansWorkspace.distributeEvenly')}
                  </button>
                  <FeePlanInstallmentEditor
                    amount={draft.amount}
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
  );
}
