import type { CollectibleBillingContext } from '@/types/payment-collection-preview';
import type { SpecialAgreementSummary } from '@/types/student-financial-overview';

export type AgreementContextLabelKind = 'name' | 'id' | 'active' | 'none';

export interface AgreementContextLabel {
  kind: AgreementContextLabelKind;
  /** Concrete value when derived from the agreement record; null when an i18n message should be shown. */
  value: string | null;
}

/**
 * Resolves how the collection-context agreement field should be displayed.
 * Never returns a bare dash: when no concrete agreement value is available it
 * signals whether an active agreement exists (so callers show a clear message
 * instead of "-").
 */
export function resolveAgreementContextLabel(
  agreement: Pick<SpecialAgreementSummary, 'name' | 'id'> | null | undefined,
  billingContext: CollectibleBillingContext | null | undefined,
): AgreementContextLabel {
  const name = agreement?.name?.trim();
  if (name) return { kind: 'name', value: name };
  if (agreement?.id) return { kind: 'id', value: `#${agreement.id}` };

  const hasActiveAgreement =
    billingContext?.mode === 'active_agreement' || billingContext?.has_active_agreement === true;
  if (hasActiveAgreement) return { kind: 'active', value: null };

  return { kind: 'none', value: null };
}
