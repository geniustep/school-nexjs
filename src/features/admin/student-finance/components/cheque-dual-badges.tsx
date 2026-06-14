'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { chequeLifecycleTone, chequeMaturityTone } from '../utils/reference-labels';

export function ChequeDualBadges({
  lifecycleState,
  maturityStatus,
}: {
  lifecycleState: string;
  maturityStatus?: string | null;
}) {
  const t = useT();
  const lifecycleKey = `admin.student360.financeOps.chequeLifecycle.${lifecycleState}`;
  const lifecycleLabel = t(lifecycleKey);
  const lifecycleText = lifecycleLabel === lifecycleKey ? lifecycleState : lifecycleLabel;

  const maturity = maturityStatus ?? 'not_applicable';
  const maturityKey = `admin.student360.financeOps.chequeMaturity.${maturity}`;
  const maturityLabel = t(maturityKey);
  const maturityText = maturityLabel === maturityKey ? maturity : maturityLabel;

  return (
    <span className="student-finance-dual-badges">
      <Badge tone={chequeLifecycleTone(lifecycleState)}>{lifecycleText}</Badge>
      {maturity !== 'not_applicable' && maturity !== 'settled' ? (
        <Badge tone={chequeMaturityTone(maturity)}>{maturityText}</Badge>
      ) : null}
    </span>
  );
}

import { scheduleItemStateTone } from '../utils/reference-labels';

export function ScheduleItemStateBadge({ state }: { state: string }) {
  const t = useT();
  const key = `admin.student360.financialAgreement.scheduleStates.${state}`;
  const label = t(key);
  const text = label === key ? state : label;
  return <Badge tone={scheduleItemStateTone(state)}>{text}</Badge>;
}
