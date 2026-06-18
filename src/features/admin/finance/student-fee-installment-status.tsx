'use client';

import type { FinanceInstallment } from '@/types/finance';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import { InstallmentRowStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import {
  hasInstallmentPendingChequeCoverage,
  resolveEffectiveInstallmentPaymentStatus,
  resolveEffectiveInstallmentTimingStatus,
} from '@/features/admin/student-finance/utils/resolve-installment-presentation';
import { installmentIsOverdue } from '@/lib/utils/finance';

function toInstallmentRow(row: FinanceInstallment): StudentInstallment {
  const timing =
    row.timing_status ??
    (installmentIsOverdue(row) ? 'overdue' : row.due_date ? 'due' : 'not_applicable');

  return {
    id: row.id ?? 0,
    due_date: row.due_date ?? null,
    amount: row.amount,
    confirmed_paid_amount: row.paid_amount ?? 0,
    pending_cheque_amount: 0,
    remaining_amount: row.remaining_amount ?? 0,
    payment_status: row.payment_status ?? row.state ?? row.status ?? 'unpaid',
    timing_status: timing,
  };
}

export function FinanceInstallmentStatusBadges({ row }: { row: FinanceInstallment }) {
  const installment = toInstallmentRow(row);
  const pendingCheque = hasInstallmentPendingChequeCoverage(installment);

  return (
    <InstallmentRowStatusBadges
      paymentStatus={resolveEffectiveInstallmentPaymentStatus(installment)}
      timingStatus={resolveEffectiveInstallmentTimingStatus(installment) ?? 'not_applicable'}
      pendingChequeCoverage={pendingCheque}
    />
  );
}
