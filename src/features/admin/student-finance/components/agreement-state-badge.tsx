'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  agreementStateTone,
  normalizeReferenceValue,
  resolveAgreementStateLabel,
  resolveFinanceAgreementStateLabel,
} from '../utils/reference-labels';

export function AgreementStateBadge({
  state,
  financeContext = false,
  hasBillableContext = false,
}: {
  state: string;
  financeContext?: boolean;
  hasBillableContext?: boolean;
}) {
  const t = useT();
  const slug = normalizeReferenceValue(state);
  const text =
    financeContext && hasBillableContext && slug !== 'active'
      ? resolveFinanceAgreementStateLabel(t, state, { hasBillableContext: true })
      : resolveAgreementStateLabel(t, state);
  return <Badge tone={agreementStateTone(slug)}>{text}</Badge>;
}
