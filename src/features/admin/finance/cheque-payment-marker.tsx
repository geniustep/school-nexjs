'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import type { FinanceCheque, ParentChequeInfo, PaymentCollection, StudentFee } from '@/types/finance';
import {
  adminChequeMarkerKey,
  isChequePayment,
  parentChequeMarkerKey,
} from '@/lib/utils/cheque';

export function ChequePaymentMarker({
  cheque,
  collection,
  fee,
  variant = 'admin',
}: {
  cheque?: FinanceCheque | ParentChequeInfo | null;
  collection?: PaymentCollection | null;
  fee?: StudentFee | null;
  variant?: 'admin' | 'parent';
}) {
  const t = useT();
  const resolved =
    cheque ??
    collection?.cheque ??
    fee?.cheque ??
    (collection && isChequePayment(collection.payment_method) ? collection.cheque : null) ??
    (fee?.paid_by_cheque ? fee.cheque : null);

  if (!resolved?.state && !isChequePayment(collection?.payment_method)) return null;

  const key =
    variant === 'parent'
      ? parentChequeMarkerKey(resolved ?? undefined)
      : adminChequeMarkerKey(resolved ?? undefined);

  if (!key) return null;

  const chequeId = resolved?.id ?? collection?.cheque?.id;
  const label = t(key);

  if (variant === 'admin' && chequeId) {
    return (
      <Link href={`/admin/finance/cheques/${chequeId}`} className="finance-cheque-marker" aria-label={label}>
        <ChequeStatusBadge state={resolved?.state ?? 'received'} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <span className="finance-cheque-marker" aria-label={label}>
      {variant === 'admin' && resolved?.state ? <ChequeStatusBadge state={resolved.state} /> : null}
      <span>{label}</span>
    </span>
  );
}
