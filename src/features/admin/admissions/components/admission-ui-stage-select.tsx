'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionKanbanDragRecord } from '../utils/admission-kanban-drag';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import { admissionStateTone } from '../utils/admission-labels';
import {
  admissionManualStageLabelKey,
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
  type AdmissionManualStage,
} from '../utils/admission-stage-options';
import {
  resolveAdmissionPrimaryDisplay,
} from '../utils/admission-status-display';
import {
  admissionUiStageTone,
  resolveAdmissionUiStage,
} from '../utils/admission-ui-stage';

export function AdmissionUiStageSelect({
  record,
  admissionId,
  onChanged,
  className,
  disabled,
}: {
  record: AdmissionKanbanDragRecord;
  admissionId: number;
  onChanged?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const options = getAdmissionManualStageOptions();
  const rawState = String(record.state ?? '');
  const manual = isAdmissionManualStage(rawState);
  const { changeState, isPending } = useAdmissionStateChange(onChanged);
  const [current, setCurrent] = useState<AdmissionManualStage>(
    manual ? rawState : 'new',
  );
  const saving = isPending(admissionId);

  useEffect(() => {
    if (isAdmissionManualStage(rawState)) setCurrent(rawState);
  }, [rawState]);

  async function handleChange(next: AdmissionManualStage) {
    if (next === current || saving || disabled) return;
    const decision = evaluateManualStageChange(record, next);
    if (!decision.apply || !decision.targetState) {
      if (isAdmissionManualStage(rawState)) setCurrent(rawState);
      return;
    }
    const previous = current;
    setCurrent(next);
    const ok = await changeState(admissionId, decision.targetState);
    if (!ok) setCurrent(previous);
  }

  if (!manual) {
    const primary = resolveAdmissionPrimaryDisplay(record);
    const uiStage = resolveAdmissionUiStage(record);
    let label: string;
    if (
      primary.kind === 'ready_for_registration' ||
      primary.kind === 'registered' ||
      primary.kind === 'school_rejected' ||
      primary.kind === 'awaiting_registration'
    ) {
      label = t(primary.labelKey);
    } else {
      const stateKey = `admin.admissions.states.${rawState}`;
      const stateLabel = t(stateKey);
      label =
        stateLabel !== stateKey ? stateLabel : t(`admin.admissions.uiStages.${uiStage}`);
    }
    return (
      <span data-testid="admission-current-stage-badge">
        <Badge
          tone={
            primary.kind === 'ui_stage'
              ? admissionUiStageTone(uiStage)
              : primary.tone
          }
        >
          {label}
        </Badge>
      </span>
    );
  }

  return (
    <select
      className={cn('input admission-ui-stage-select', className)}
      value={current}
      disabled={disabled || saving}
      aria-label={t('admin.admissions.detail.pipelineStage')}
      data-testid="admission-manual-stage-select"
      onChange={(e) => void handleChange(e.target.value as AdmissionManualStage)}
    >
      {options.map((stage) => (
        <option key={stage} value={stage}>
          {t(admissionManualStageLabelKey(stage))}
        </option>
      ))}
    </select>
  );
}

export function AdmissionDetailedStateBadge({ state }: { state: string }) {
  const t = useT();
  return (
    <Badge tone={admissionStateTone(state)}>
      {t(`admin.admissions.states.${state}`)}
    </Badge>
  );
}
