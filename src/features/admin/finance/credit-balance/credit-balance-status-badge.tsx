'use client';

import { useT } from '@/features/i18n/locale-context';
import type { CreditBalanceLifecycleState } from '@/types/finance-credit-balance';

const STATE_CLASS: Record<string, string> = {
  available: 'finance-credit-badge--available',
  pending: 'finance-credit-badge--pending',
  blocked: 'finance-credit-badge--blocked',
  applied: 'finance-credit-badge--applied',
  fully_applied: 'finance-credit-badge--applied',
  empty: 'finance-credit-badge--empty',
};

export function CreditBalanceStatusBadge({
  state,
}: {
  state?: CreditBalanceLifecycleState | string | null;
}) {
  const t = useT();
  const key = state ?? 'empty';
  const labelKey = `admin.finance.creditBalances.states.${key}`;
  const label = t(labelKey);
  const className = STATE_CLASS[key] ?? 'finance-credit-badge--empty';
  return (
    <span className={`finance-credit-badge ${className}`}>
      <span className="finance-credit-badge__dot" aria-hidden />
      {label}
    </span>
  );
}

export function SettlementStatusLabel({ code }: { code?: string | null }) {
  const t = useT();
  if (!code) return <span>{t('common.dash')}</span>;
  const key = `admin.finance.creditBalances.settlement.${code}`;
  const translated = t(key);
  return <span>{translated === key ? code : translated}</span>;
}

export function BlockReasonLabel({ code }: { code?: string | null }) {
  const t = useT();
  if (!code) return <span>{t('common.dash')}</span>;
  const key = `admin.finance.creditBalances.blockReasons.${code}`;
  const translated = t(key);
  return <span>{translated === key ? code : translated}</span>;
}
