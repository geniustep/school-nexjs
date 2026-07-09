'use client';

import { useEffect, useMemo, useState } from 'react';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  applyChildShareTotals,
  buildChildShareTotals,
  clearChildAllocations,
  fillChildRemainingShare,
  installmentAllocationAmount,
  redistributeChildInstallmentAllocations,
  sumFamilyAllocationAmounts,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { sortInstallmentsForFamilySuggestion } from '@/features/admin/finance/family-suggested-allocation-utils';
import { useT } from '@/features/i18n/locale-context';
import { familyFinanceServiceTypeLabelKey } from '@/lib/utils/normalize-family-finance';
import type { FamilyOpenInstallment } from '@/types/family-finance';

type ManualEditorLevel = 'children' | 'child-detail';

export function FamilyCollectionManualEditor({
  open,
  installments,
  allocationInputs,
  collectionAmount,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
  collectionAmount: number;
  currency?: string | null;
  onClose: () => void;
  onSave: (values: Record<number, string>) => void;
}) {
  const t = useT();
  const [level, setLevel] = useState<ManualEditorLevel>('children');
  const [draftInputs, setDraftInputs] = useState<Record<number, string>>(allocationInputs);
  const [childShares, setChildShares] = useState<Record<number, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const childTotals = useMemo(
    () => buildChildShareTotals({ installments, allocationInputs: draftInputs }),
    [installments, draftInputs],
  );

  const allStudentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const row of installments) ids.add(row.student_id);
    return Array.from(ids).sort((a, b) => a - b);
  }, [installments]);

  const selectedChildInstallments = useMemo(() => {
    if (selectedStudentId == null) return [];
    return sortInstallmentsForFamilySuggestion(
      installments.filter((row) => row.student_id === selectedStudentId),
    );
  }, [installments, selectedStudentId]);

  const allocatedDraft = sumFamilyAllocationAmounts(draftInputs);
  const unallocatedDraft = Math.max(0, collectionAmount - allocatedDraft);

  function syncChildSharesFromDraft(nextInputs: Record<number, string>) {
    const totals = buildChildShareTotals({ installments, allocationInputs: nextInputs });
    const shares: Record<number, string> = {};
    for (const row of totals) {
      shares[row.studentId] = row.share > 0 ? String(row.share) : '';
    }
    for (const studentId of allStudentIds) {
      if (!(studentId in shares)) shares[studentId] = '';
    }
    setChildShares(shares);
  }

  useEffect(() => {
    if (!open) return;
    setDraftInputs(allocationInputs);
    setLevel('children');
    setSelectedStudentId(null);
    const totals = buildChildShareTotals({ installments, allocationInputs });
    const shares: Record<number, string> = {};
    for (const row of totals) {
      shares[row.studentId] = row.share > 0 ? String(row.share) : '';
    }
    for (const studentId of allStudentIds) {
      if (!(studentId in shares)) shares[studentId] = '';
    }
    setChildShares(shares);
  }, [open, allocationInputs, installments, allStudentIds]);

  if (!open) return null;

  function handleOpenChildDetail(studentId: number) {
    setSelectedStudentId(studentId);
    setLevel('child-detail');
  }

  function handleChildShareChange(studentId: number, value: string) {
    const nextShares = { ...childShares, [studentId]: value };
    setChildShares(nextShares);
    const nextInputs = applyChildShareTotals({
      shares: nextShares,
      installments,
      currentInputs: draftInputs,
    });
    setDraftInputs(nextInputs);
  }

  function handleChildInstallmentChange(installmentId: number, value: string) {
    setDraftInputs((current) => ({ ...current, [installmentId]: value }));
  }

  function handleRedistributeChild() {
    if (selectedStudentId == null) return;
    const share =
      childTotals.find((row) => row.studentId === selectedStudentId)?.share ??
      Number(childShares[selectedStudentId] ?? 0);
    const next = redistributeChildInstallmentAllocations({
      studentId: selectedStudentId,
      childShare: share,
      installments,
      currentInputs: draftInputs,
    });
    setDraftInputs(next);
    syncChildSharesFromDraft(next);
  }

  function handleClearChild() {
    if (selectedStudentId == null) return;
    const next = clearChildAllocations({
      studentId: selectedStudentId,
      installments,
      currentInputs: draftInputs,
    });
    setDraftInputs(next);
    syncChildSharesFromDraft(next);
  }

  function handleFillChildRemaining() {
    if (selectedStudentId == null) return;
    const targetShare = Number(childShares[selectedStudentId] ?? 0) || unallocatedDraft;
    const next = fillChildRemainingShare({
      studentId: selectedStudentId,
      targetShare:
        targetShare +
        (childTotals.find((row) => row.studentId === selectedStudentId)?.share ?? 0),
      installments,
      currentInputs: draftInputs,
    });
    setDraftInputs(next);
    syncChildSharesFromDraft(next);
  }

  function handleSave() {
    onSave(draftInputs);
    onClose();
  }

  function handleBackToChildren() {
    setLevel('children');
    setSelectedStudentId(null);
    syncChildSharesFromDraft(draftInputs);
  }

  const selectedStudentName =
    childTotals.find((row) => row.studentId === selectedStudentId)?.studentName ??
    `#${selectedStudentId ?? ''}`;

  return (
    <div className="finance-family-manual-editor" role="dialog" aria-modal="true">
      <div className="finance-family-manual-editor__panel">
        <header className="finance-family-manual-editor__header">
          <h4>
            {level === 'children'
              ? t('admin.finance.billingAccounts.familyCollection.manualEditor.title')
              : t('admin.finance.billingAccounts.familyCollection.manualEditor.childTitle', {
                  name: selectedStudentName,
                })}
          </h4>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        {level === 'children' ? (
          <div className="finance-family-manual-editor__body">
            <p className="tiny muted">
              {t('admin.finance.billingAccounts.familyCollection.manualEditor.childrenHint')}
            </p>
            <div className="finance-family-manual-editor__child-shares">
              {allStudentIds.map((studentId) => {
                const name =
                  childTotals.find((row) => row.studentId === studentId)?.studentName ??
                  `#${studentId}`;
                return (
                  <div key={studentId} className="finance-family-manual-editor__child-row">
                    <label dir="auto">{name}</label>
                    <FinanceAmountInput
                      value={childShares[studentId] ?? ''}
                      onChange={(value) => handleChildShareChange(studentId, value)}
                      aria-label={name}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleOpenChildDetail(studentId)}
                    >
                      {t('admin.finance.billingAccounts.familyCollection.manualEditor.editChildDetails', {
                        name,
                      })}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="tiny muted finance-family-manual-editor__unallocated" role="status">
              {t('admin.finance.billingAccounts.familyCollection.manualEditor.unallocatedRemaining', {
                amount: String(unallocatedDraft),
              })}
            </p>
          </div>
        ) : (
          <div className="finance-family-manual-editor__body">
            <div className="finance-family-manual-editor__child-actions row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--secondary btn--sm" onClick={handleRedistributeChild}>
                {t('admin.finance.billingAccounts.familyCollection.manualEditor.redistributeChild')}
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={handleFillChildRemaining}>
                {t('admin.finance.billingAccounts.familyCollection.manualEditor.fillRemaining')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearChild}>
                {t('admin.finance.billingAccounts.familyCollection.manualEditor.clearChild')}
              </button>
            </div>
            <div className="finance-family-manual-editor__installments">
              {selectedChildInstallments.map((row) => (
                <label key={row.installment_id} className="finance-family-manual-editor__installment">
                  <div className="finance-family-manual-editor__installment-label">
                    <span dir="auto">
                      {row.service_label?.trim()
                        ? row.service_label
                        : row.service_type
                          ? t(familyFinanceServiceTypeLabelKey(row.service_type))
                          : t('common.dash')}
                    </span>
                    <span className="tiny muted">
                      {t('admin.finance.remainingAmount')}:{' '}
                      <FinanceMoney amount={row.remaining_amount} currency={currency} />
                    </span>
                  </div>
                  <FinanceAmountInput
                    value={draftInputs[row.installment_id] ?? ''}
                    onChange={(value) => handleChildInstallmentChange(row.installment_id, value)}
                  />
                </label>
              ))}
            </div>
            <p className="tiny muted">
              {t('admin.finance.billingAccounts.familyCollection.studentTotal')}:{' '}
              <FinanceMoney
                amount={
                  childTotals.find((row) => row.studentId === selectedStudentId)?.share ??
                  selectedChildInstallments.reduce(
                    (sum, row) => sum + installmentAllocationAmount(draftInputs, row.installment_id),
                    0,
                  )
                }
                currency={currency}
              />
            </p>
          </div>
        )}

        <footer className="finance-family-manual-editor__footer form-actions">
          {level === 'child-detail' ? (
            <button type="button" className="btn btn--secondary" onClick={handleBackToChildren}>
              {t('admin.finance.billingAccounts.familyCollection.manualEditor.backToChildren')}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            {t('admin.finance.billingAccounts.familyCollection.manualEditor.applyChanges')}
          </button>
        </footer>
      </div>
    </div>
  );
}
