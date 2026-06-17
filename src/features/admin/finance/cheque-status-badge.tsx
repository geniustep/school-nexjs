'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { chequeStateTone, normalizeChequeState } from '@/lib/utils/cheque';

function settlementTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  switch (status) {
    case 'settled':
      return 'green';
    case 'pending':
      return 'amber';
    case 'rejected':
      return 'red';
    case 'cancelled':
      return 'slate';
    default:
      return 'slate';
  }
}

export function ChequeStatusBadge({
  state,
  settlementStatus,
}: {
  state?: string;
  settlementStatus?: string | null;
}) {
  const t = useT();
  const settlement = settlementStatus?.trim().toLowerCase();
  if (settlement) {
    const key = `admin.finance.collections.detail.chequeSettlement.${settlement}`;
    const label = t(key);
    if (label !== key) {
      return <Badge tone={settlementTone(settlement)}>{label}</Badge>;
    }
    if (settlement === 'settled') {
      return <Badge tone="green">{t('admin.finance.cheques.lifecycle.chequeSettled')}</Badge>;
    }
    if (settlement === 'rejected') {
      return <Badge tone="red">{t('admin.finance.cheques.lifecycle.chequeRejected')}</Badge>;
    }
  }
  const normalized = normalizeChequeState(state ?? 'received');
  const key = `admin.finance.cheques.states.${normalized}`;
  const label = t(key);
  const text = label === key ? (state || '—') : label;
  return <Badge tone={chequeStateTone(normalized)}>{text}</Badge>;
}
