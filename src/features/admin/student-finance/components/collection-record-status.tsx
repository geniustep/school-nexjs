'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { isChequePayment } from '@/lib/utils/cheque';
import { collectionState, financeStatusTone } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';

function resolveCollectionSettlementKey(row: PaymentCollection): string | null {
  if (!isChequePayment(row.payment_method)) return null;
  const cheque = row.cheque as { settlement_status?: string } | undefined;
  const raw =
    (row as { settlement_state?: string }).settlement_state ??
    (row as { settlement_status?: string }).settlement_status ??
    cheque?.settlement_status;
  if (raw) return String(raw);
  if (row.state === 'cancelled' || row.status === 'cancelled') return 'cancelled';
  return 'pending_cheque';
}

function settlementTone(key: string): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (key === 'cheque_cleared' || key === 'cleared' || key === 'settled') return 'green';
  if (key === 'cheque_bounced' || key === 'bounced' || key === 'rejected') return 'red';
  if (key === 'cancelled') return 'slate';
  return 'amber';
}

export function CollectionRecordStatus({ row }: { row: PaymentCollection }) {
  const t = useT();
  const recordState = String(collectionState(row));
  const recordKey = `admin.student360.financeWorkspace.collections.recordStates.${recordState}`;
  const recordLabel = t(recordKey);
  const recordText = recordLabel === recordKey ? recordState : recordLabel;
  const settlementKey = resolveCollectionSettlementKey(row);

  return (
    <div className="student-finance-collection-status">
      <div className="student-finance-collection-status__row">
        <span className="tiny muted">{t('admin.student360.financeWorkspace.collections.recordState')}</span>
        <Badge tone={financeStatusTone(recordState)}>{recordText}</Badge>
      </div>
      {settlementKey ? (
        <div className="student-finance-collection-status__row">
          <span className="tiny muted">
            {t('admin.student360.financeWorkspace.collections.settlementState')}
          </span>
          <Badge tone={settlementTone(settlementKey)}>
            {(() => {
              const key = `admin.student360.financeWorkspace.collections.settlement.${settlementKey}`;
              const label = t(key);
              return label === key ? settlementKey : label;
            })()}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
