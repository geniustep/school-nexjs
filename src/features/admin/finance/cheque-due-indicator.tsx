'use client';

import { useT } from '@/features/i18n/locale-context';
import type { FinanceCheque } from '@/types/finance';
import { normalizeChequeState } from '@/lib/utils/cheque';

export function ChequeDueIndicator({ cheque }: { cheque: Pick<FinanceCheque, 'state' | 'is_due' | 'is_overdue' | 'days_until_due' | 'due_date'> }) {
  const t = useT();
  const state = normalizeChequeState(cheque.state);
  if (state === 'cleared' || state === 'rejected' || state === 'cancelled') return null;

  if (cheque.is_overdue) {
    return <p className="finance-cheque-alert finance-cheque-alert--overdue">{t('admin.finance.cheques.overdue')}</p>;
  }
  if (cheque.is_due) {
    return <p className="finance-cheque-alert finance-cheque-alert--due">{t('admin.finance.cheques.dueToday')}</p>;
  }
  if (cheque.days_until_due != null && cheque.days_until_due >= 0 && cheque.days_until_due <= 3) {
    return (
      <p className="finance-cheque-alert finance-cheque-alert--soon">
        {t('admin.finance.cheques.dueSoon', { days: cheque.days_until_due })}
      </p>
    );
  }
  return null;
}
