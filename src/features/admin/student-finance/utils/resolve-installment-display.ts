import { resolveLegacyInstallmentDisplayLabel } from '@/features/admin/finance/resolve-legacy-collection-display';

type InstallmentLike = {
  display_label?: string | null;
  fee_name?: string | null;
  fee_type_name?: string | null;
  period_label?: string | null;
  sequence?: number | null;
  installment_sequence?: number | null;
  installment_count?: number | null;
};

/** Official installment label — uses backend `display_label` when present. */
export function resolveInstallmentDisplayLabel(
  row: InstallmentLike,
  locale?: string,
): string {
  const official = row.display_label?.trim();
  if (official) return official;
  return resolveLegacyInstallmentDisplayLabel(row, locale);
}
