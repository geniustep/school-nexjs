'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import {
  admissionManualStageLabelKey,
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
  type AdmissionManualStage,
} from '../utils/admission-stage-options';
import { resolveAdmissionPrimaryDisplay } from '../utils/admission-status-display';

/** Restricted state select — manual follow-up stages only. */
export function AdmissionStateSelect({
  admissionId,
  value,
  onChanged,
  className,
  disabled,
  studentId,
  registrationFlowState,
}: {
  admissionId: number;
  value: string;
  onChanged?: () => void;
  /** @deprecated Closed states are never offered as manual transitions. */
  includeClosedStates?: boolean;
  className?: string;
  disabled?: boolean;
  studentId?: number | false | null;
  registrationFlowState?: string | null;
}) {
  const t = useT();
  const options = getAdmissionManualStageOptions();
  const { changeState, isPending } = useAdmissionStateChange(onChanged);
  const manual = isAdmissionManualStage(value);
  const [current, setCurrent] = useState<AdmissionManualStage>(manual ? value : 'new');
  const saving = isPending(admissionId);
  const record = {
    state: value,
    student_id: studentId,
    registration_flow_state: registrationFlowState,
  };

  useEffect(() => {
    if (isAdmissionManualStage(value)) setCurrent(value);
  }, [value]);

  if (!manual) {
    const primary = resolveAdmissionPrimaryDisplay(record);
    const label =
      primary.kind === 'ui_stage'
        ? t(`admin.admissions.states.${value}`)
        : t(primary.labelKey);
    return <Badge tone={primary.tone}>{label}</Badge>;
  }

  async function handleChange(next: string) {
    if (next === current || saving || disabled) return;
    const decision = evaluateManualStageChange(record, next);
    if (!decision.apply || !decision.targetState) return;
    const previous = current;
    setCurrent(decision.targetState);
    const ok = await changeState(admissionId, decision.targetState);
    if (!ok) setCurrent(previous);
  }

  return (
    <select
      className={cn('input admission-state-select', className)}
      value={current}
      disabled={disabled || saving}
      aria-label={t('admin.admissions.actions.changeFollowUp')}
      data-testid="admission-state-select"
      onChange={(e) => void handleChange(e.target.value)}
    >
      {options.map((state) => (
        <option key={state} value={state}>
          {t(admissionManualStageLabelKey(state))}
        </option>
      ))}
    </select>
  );
}
