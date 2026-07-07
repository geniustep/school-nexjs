'use client';

import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { admissionUiStageTone, resolveAdmissionUiStage } from '../utils/admission-ui-stage';
import type { AdmissionKanbanDragRecord } from '../utils/admission-kanban-drag';
import {
  AdmissionDetailedStateBadge,
  AdmissionUiStageSelect,
} from './admission-ui-stage-select';

export function AdmissionPipelineStatus({
  record,
  admissionId,
  canChangeState,
  onChanged,
  className,
  rejected = false,
}: {
  record: AdmissionKanbanDragRecord;
  admissionId: number;
  canChangeState: boolean;
  onChanged?: () => void;
  className?: string;
  rejected?: boolean;
}) {
  const t = useT();
  const uiStage = resolveAdmissionUiStage(record);

  return (
    <div className={cn('admissions-pipeline-status', className)}>
      <div className="admissions-pipeline-status__primary">
        <span className="admissions-pipeline-status__label tiny muted">
          {t('admin.admissions.detail.pipelineStage')}
        </span>
        {canChangeState ? (
          <AdmissionUiStageSelect
            record={record}
            admissionId={admissionId}
            onChanged={onChanged}
            className="admission-ui-stage-select--detail"
          />
        ) : (
          <Badge tone={admissionUiStageTone(uiStage)}>
            {t(`admin.admissions.uiStages.${uiStage}`)}
          </Badge>
        )}
      </div>

      <div className="admissions-pipeline-status__detailed">
        <span className="admissions-pipeline-status__label tiny muted">
          {t('admin.admissions.detail.detailedState')}
        </span>
        <AdmissionDetailedStateBadge state={record.state} />
      </div>

      {rejected ? (
        <span className="admissions-pipeline-status__rejection">
          <Badge tone="red">{t('admin.admissions.rejection.status')}</Badge>
        </span>
      ) : null}
    </div>
  );
}
