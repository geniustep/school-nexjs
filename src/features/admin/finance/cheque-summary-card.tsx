'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import type { FinanceCheque } from '@/types/finance';
import { financeStudentDisplayName } from '@/lib/utils/finance';

export function ChequeSummaryCard({ cheque }: { cheque: FinanceCheque }) {
  const t = useT();
  const studentLabel =
    cheque.student_name ?? financeStudentDisplayName(cheque.student ?? {}) ?? t('common.dash');

  return (
    <div className="card finance-cheque-summary">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>{cheque.cheque_number ?? t('common.dash')}</strong>
          <p className="muted">{cheque.bank_name ?? t('common.dash')}</p>
        </div>
        <ChequeStatusBadge state={cheque.state ?? 'received'} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>{t('nav.students')}</dt>
          <dd>{studentLabel}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.cheques.holderName')}</dt>
          <dd>{cheque.holder_name ?? t('common.dash')}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionAmount')}</dt>
          <dd>
            <FinanceMoney amount={cheque.amount} currency={cheque.currency} />
          </dd>
        </div>
      </dl>
      <ChequeDueIndicator cheque={cheque} />
      <Link href={`/admin/finance/cheques/${cheque.id}`} className="btn btn--ghost btn--sm">
        {t('admin.finance.cheques.viewDetail')}
      </Link>
    </div>
  );
}
