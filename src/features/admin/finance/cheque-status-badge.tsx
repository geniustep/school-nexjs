'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { chequeStateTone, normalizeChequeState } from '@/lib/utils/cheque';

export function ChequeStatusBadge({ state }: { state: string }) {
  const t = useT();
  const normalized = normalizeChequeState(state);
  const key = `admin.finance.cheques.states.${normalized}`;
  const label = t(key);
  const text = label === key ? (state || '—') : label;
  return <Badge tone={chequeStateTone(normalized)}>{text}</Badge>;
}
