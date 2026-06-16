'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

function receiptStateTone(state: string): 'green' | 'amber' | 'red' | 'slate' {
  switch (state) {
    case 'issued':
      return 'green';
    case 'reversed':
      return 'red';
    case 'cancelled_before_issue':
      return 'amber';
    default:
      return 'slate';
  }
}

function settlementTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' {
  switch (status) {
    case 'settled':
    case 'cheque_cleared':
      return 'green';
    case 'pending_cheque':
      return 'blue';
    case 'cheque_bounced':
    case 'reversed':
      return 'red';
    default:
      return 'slate';
  }
}

export function ReceiptStateBadge({ state }: { state: string }) {
  const t = useT();
  const key = `admin.finance.receipts.states.${state}`;
  const label = t(key);
  const text = label === key ? state : label;
  return (
    <Badge tone={receiptStateTone(state)}>
      <span className="finance-status-badge__label">{text}</span>
    </Badge>
  );
}

export function ReceiptSettlementBadge({ status }: { status: string }) {
  const t = useT();
  const key = `admin.finance.receipts.settlement.${status}`;
  const label = t(key);
  const text = label === key ? status : label;
  return (
    <Badge tone={settlementTone(status)}>
      <span className="finance-status-badge__label">{text}</span>
    </Badge>
  );
}
