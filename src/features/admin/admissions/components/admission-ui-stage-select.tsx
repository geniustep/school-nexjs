'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionKanbanDragRecord, DraggableAdmissionUiStage } from '../utils/admission-kanban-drag';
import { evaluateKanbanDragStateChange } from '../utils/admission-kanban-drag';
import { useAdmissionStateChange } from '../hooks/use-admission-state-change';
import { admissionStateTone } from '../utils/admission-labels';
import {
  admissionUiStageTone,
  CLOSED_UI_STAGE,
  REGISTERED_UI_STAGE,
  resolveAdmissionUiStage,
  type AdmissionUiStage,
} from '../utils/admission-ui-stage';

const CHANGEABLE_UI_STAGES: DraggableAdmissionUiStage[] = [
  'new',
  'in_follow_up',
  'in_evaluation',
];

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
  const uiStage = resolveAdmissionUiStage(record);
  const { changeState, isPending } = useAdmissionStateChange(onChanged);
  const [current, setCurrent] = useState<AdmissionUiStage>(uiStage);
  const saving = isPending(admissionId);

  useEffect(() => {
    setCurrent(uiStage);
  }, [uiStage]);

  async function handleChange(nextStage: AdmissionUiStage) {
    if (nextStage === current || saving || disabled) return;

    const decision = evaluateKanbanDragStateChange(record, nextStage);
    if (!decision.apply || !decision.targetState) {
      setCurrent(uiStage);
      return;
    }

    const previous = current;
    setCurrent(nextStage);
    const ok = await changeState(admissionId, decision.targetState);
    if (!ok) setCurrent(previous);
  }

  if (uiStage === REGISTERED_UI_STAGE) {
    return (
      <Badge tone={admissionUiStageTone(REGISTERED_UI_STAGE)}>
        {t('admin.admissions.uiStages.registered')}
      </Badge>
    );
  }

  if (uiStage === CLOSED_UI_STAGE) {
    return (
      <Badge tone={admissionUiStageTone(CLOSED_UI_STAGE)}>
        {t('admin.admissions.uiStages.closed')}
      </Badge>
    );
  }

  return (
    <select
      className={cn('input admission-ui-stage-select', className)}
      value={current}
      disabled={disabled || saving}
      aria-label={t('admin.admissions.detail.pipelineStage')}
      onChange={(e) => void handleChange(e.target.value as AdmissionUiStage)}
    >
      {CHANGEABLE_UI_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {t(`admin.admissions.uiStages.${stage}`)}
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
