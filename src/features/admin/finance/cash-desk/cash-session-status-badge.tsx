'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { CashSessionState } from '@/types/finance-cash-desk';

export function cashSessionStateTone(state: string | undefined | null): 'green' | 'amber' | 'slate' | 'blue' {
  switch (state) {
    case 'open':
    case 'reopened':
      return 'green';
    case 'closing':
      return 'amber';
    case 'closed':
      return 'slate';
    default:
      return 'blue';
  }
}

export function CashSessionStatusBadge({ state }: { state?: CashSessionState | string | null }) {
  const t = useT();
  if (!state) return null;
  const key = `admin.finance.cashDesk.states.${state}`;
  const label = t(key);
  return <Badge tone={cashSessionStateTone(state)}>{label === key ? state : label}</Badge>;
}

export function CashDeskHubBadge({ state }: { state?: CashSessionState | string | null }) {
  const t = useT();
  if (!state) {
    return <span className="finance-hub-card-badge">{t('admin.finance.cashDesk.hubBadgeNoSession')}</span>;
  }
  const key = `admin.finance.cashDesk.hubBadge.${state}`;
  const label = t(key);
  return <span className="finance-hub-card-badge">{label === key ? state : label}</span>;
}

export function cashMovementTypeLabelKey(type: string | undefined | null): string {
  const code = (type ?? '').trim();
  if (!code) return 'admin.finance.cashDesk.movements.types.unknown';
  return `admin.finance.cashDesk.movements.types.${code}`;
}

export const CASH_MOVEMENT_TYPE_OPTIONS = [
  'cash_in_adjustment',
  'cash_out_adjustment',
  'bank_deposit',
  'safe_transfer_out',
  'safe_transfer_in',
] as const;

export function useCashMovementOptions() {
  const t = useT();
  return useMemo(
    () =>
      CASH_MOVEMENT_TYPE_OPTIONS.map((code) => ({
        code,
        label: t(cashMovementTypeLabelKey(code)),
      })),
    [t],
  );
}
