'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { financeStatusTone } from '@/lib/utils/finance';

export function FinanceStatusBadge({ state }: { state: string }) {
  const t = useT();
  const key = `admin.finance.states.${state}` as const;
  const label = t(key);
  const text = label === key ? state : label;
  return <Badge tone={financeStatusTone(state)}>{text}</Badge>;
}
