'use client';

import { useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  applyCreditErrorMessageKey,
  canShowApplyCreditButton,
} from '@/lib/utils/normalize-credit-balance';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FinanceInstallment } from '@/types/finance';
import type { ApplyCreditAllocationPayload } from '@/types/finance-credit-balance';

function canAllocateInstallment(row: FinanceInstallment): boolean {
  if ((row.remaining_amount ?? 0) <= 0) return false;
  if (row.payment_status === 'paid' || row.state === 'cancelled') return false;
  return true;
}

export function validateApplyCreditAllocations(input: {
  availableAmount: number;
  values: Record<number, string>;
  installments: FinanceInstallment[];
}): string | null {
  let total = 0;
  const seen = new Set<number>();
  for (const [idRaw, amountRaw] of Object.entries(input.values)) {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) continue;
    const installmentId = Number(idRaw);
    if (seen.has(installmentId)) return 'duplicateAllocation';
    seen.add(installmentId);
    const row = input.installments.find((item) => item.id === installmentId);
    if (!row) return 'invalidAllocation';
    if (!canAllocateInstallment(row)) return 'invalidAllocation';
    if (amount - (row.remaining_amount ?? 0) > 0.0001) return 'allocationExceedsReceivable';
    total += amount;
  }
  if (total <= 0) return 'emptyAllocation';
  if (total - input.availableAmount > 0.0001) return 'allocationExceedsCredit';
  return null;
}

export function buildApplyCreditPayload(
  values: Record<number, string>,
): ApplyCreditAllocationPayload {
  const allocations: ApplyCreditAllocationPayload['allocations'] = [];
  for (const [idRaw, amountRaw] of Object.entries(values)) {
    const amount = Number(amountRaw);
    if (!amount || amount <= 0) continue;
    allocations.push({ installment_id: Number(idRaw), amount });
  }
  return { allocations };
}

export function ApplyCreditDrawer({
  open,
  collectionId,
  billingPartnerId,
  availableAmount,
  currency,
  receiptNumber,
  paymentMethod,
  onClose,
  onSuccess,
}: {
  open: boolean;
  collectionId: number;
  billingPartnerId: number | null;
  availableAmount: number;
  currency?: unknown;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const [values, setValues] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const installmentsState = useAdminResource<unknown>(
    open && billingPartnerId
      ? endpoints.admin.financeInstallments
      : null,
    open && billingPartnerId
      ? {
          billing_partner_id: billingPartnerId,
          page: 1,
          page_size: 100,
        }
      : undefined,
  );

  const installments = useMemo(() => {
    const parsed = parseFinanceQuickListResponse<FinanceInstallment>(installmentsState.data);
    return parsed.items.filter(canAllocateInstallment);
  }, [installmentsState.data]);

  const allocatedTotal = useMemo(
    () =>
      Object.values(values).reduce((sum, raw) => sum + (Number(raw) || 0), 0),
    [values],
  );

  const remainingCredit = Math.max(0, availableAmount - allocatedTotal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateApplyCreditAllocations({
      availableAmount,
      values,
      installments,
    });
    if (validation) {
      setFormError(t(`admin.finance.creditBalances.applyValidation.${validation}`));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = buildApplyCreditPayload(values);
    const res = await api.post<unknown>(
      endpoints.admin.financePaymentCollectionAllocate(collectionId),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      setFormError(t(applyCreditErrorMessageKey(res.error?.code)));
      return;
    }
    toast.success(t('admin.finance.creditBalances.applySuccess'));
    setValues({});
    onSuccess();
  }

  if (!open) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.creditBalances.applyCreditTitle')}
      onClose={onClose}
      size="wide"
    >
      <form className="form-stack finance-apply-credit-form" onSubmit={handleSubmit}>
        <dl className="detail-list detail-list--compact">
          <div>
            <dt>{t('admin.finance.creditBalances.applyAvailable')}</dt>
            <dd>
              <FinanceMoney amount={availableAmount} currency={currency} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.creditBalances.sources.receipt')}</dt>
            <dd className="mono">{receiptNumber ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.paymentMethod')}</dt>
            <dd>{paymentMethodLabel(paymentMethod, t)}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.creditBalances.applyRemaining')}</dt>
            <dd>
              <FinanceMoney amount={remainingCredit} currency={currency} />
            </dd>
          </div>
        </dl>

        {installmentsState.loading ? <LoadingState label={t('common.loading')} /> : null}

        {!installmentsState.loading && !installments.length ? (
          <p className="muted">{t('admin.finance.creditBalances.applyNoInstallments')}</p>
        ) : null}

        {installments.length ? (
          <div className="finance-apply-credit-installments">
            {installments.map((row) => (
              <label key={row.id} className="card finance-apply-credit-row">
                <div className="finance-apply-credit-row__main">
                  <strong dir="auto">{row.student_name ?? t('common.dash')}</strong>
                  <span dir="auto" className="tiny muted">
                    {row.service_name ?? row.name ?? t('common.dash')}
                  </span>
                  <InstallmentStatusBadges
                    paymentStatus={row.payment_status ?? row.status ?? 'unknown'}
                    timingStatus={row.timing_status ?? 'not_applicable'}
                  />
                </div>
                <dl className="finance-apply-credit-row__metrics tiny">
                  <div>
                    <dt>{t('common.date')}</dt>
                    <dd>{row.due_date ? formatDate(row.due_date) : t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.creditBalances.applyRemainingInstallment')}</dt>
                    <dd>
                      <FinanceMoney amount={row.remaining_amount} currency={currency} />
                    </dd>
                  </div>
                </dl>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  max={row.remaining_amount ?? undefined}
                  value={values[row.id ?? 0] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [row.id ?? 0]: e.target.value,
                    }))
                  }
                  aria-label={t('admin.finance.creditBalances.applyAmountFor', {
                    name: row.service_name ?? String(row.id),
                  })}
                />
              </label>
            ))}
          </div>
        ) : null}

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={
              submitting ||
              !canShowApplyCreditButton({
                available_credit_amount: availableAmount,
                allowed_actions: ['apply_credit'],
              })
            }
          >
            {submitting ? t('common.saving') : t('admin.finance.creditBalances.applyCredit')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
