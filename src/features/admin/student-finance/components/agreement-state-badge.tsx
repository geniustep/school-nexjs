'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { agreementStateTone } from '../utils/reference-labels';

export function AgreementStateBadge({ state }: { state: string }) {
  const t = useT();
  const key = `admin.student360.financialAgreement.states.${state}`;
  const label = t(key);
  const text = label === key ? state : label;
  return <Badge tone={agreementStateTone(state)}>{text}</Badge>;
}
