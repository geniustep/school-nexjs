'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { agreementStateTone, normalizeReferenceValue, resolveAgreementStateLabel } from '../utils/reference-labels';

export function AgreementStateBadge({ state }: { state: string }) {
  const t = useT();
  const slug = normalizeReferenceValue(state);
  const text = resolveAgreementStateLabel(t, state);
  return <Badge tone={agreementStateTone(slug)}>{text}</Badge>;
}
