'use client';

import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceCheque } from '@/types/finance';
import { normalizeChequeState } from '@/lib/utils/cheque';

const STEPS: { state: string; dateKey: keyof FinanceCheque; reasonKey?: keyof FinanceCheque }[] = [
  { state: 'received', dateKey: 'received_date' },
  { state: 'deposited', dateKey: 'deposited_date' },
  { state: 'cleared', dateKey: 'cleared_date' },
  { state: 'rejected', dateKey: 'rejected_date', reasonKey: 'rejection_reason' },
  { state: 'cancelled', dateKey: 'cancelled_date', reasonKey: 'cancellation_reason' },
];

export function ChequeTimeline({ cheque }: { cheque: FinanceCheque }) {
  const t = useT();
  const { formatDate } = useFormat();
  const current = normalizeChequeState(cheque.state);

  return (
    <ol className="finance-cheque-timeline">
      {STEPS.map((step) => {
        const date = cheque[step.dateKey] as string | undefined;
        const reason = step.reasonKey ? (cheque[step.reasonKey] as string | undefined) : undefined;
        const reached =
          step.state === current ||
          (step.state === 'received' && ['deposited', 'cleared'].includes(current)) ||
          (step.state === 'deposited' && current === 'cleared');
        const isTerminal = step.state === current;
        if (!date && !isTerminal && step.state !== 'received') return null;
        if (step.state === 'rejected' || step.state === 'cancelled') {
          if (current !== step.state) return null;
        } else if (current === 'rejected' || current === 'cancelled') {
          if (step.state !== 'received' && !date) return null;
        }
        return (
          <li key={step.state} className={reached || isTerminal ? 'is-active' : 'is-muted'}>
            <ChequeStatusBadge state={step.state} />
            {date && <span className="muted"> · {formatDate(date)}</span>}
            {reason && (
              <p className="muted finance-cheque-reason">
                {t('admin.finance.cheques.reason')}: {reason}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
