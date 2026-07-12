'use client';

import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionKanbanDragRecord } from '../utils/admission-kanban-drag';
import {
  admissionManualStageLabelKey,
  isAdmissionManualStage,
} from '../utils/admission-stage-options';
import { resolveAdmissionPrimaryDisplay } from '../utils/admission-status-display';
import { admissionUiStageTone, resolveAdmissionUiStage } from '../utils/admission-ui-stage';
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
  const showManualSelect =
    canChangeState && isAdmissionManualStage(String(record.state));

  let readOnlyLabel: string | null = null;
  if (!showManualSelect) {
    const primary = resolveAdmissionPrimaryDisplay(record);
    if (
      primary.kind === 'ready_for_registration' ||
      primary.kind === 'registered' ||
      primary.kind === 'school_rejected' ||
      primary.kind === 'awaiting_registration'
    ) {
      readOnlyLabel = t(primary.labelKey);
    } else if (isAdmissionManualStage(String(record.state))) {
      readOnlyLabel = t(
        admissionManualStageLabelKey(
          String(record.state) as Parameters<typeof admissionManualStageLabelKey>[0],
        ),
      );
    } else {
      const stateKey = `admin.admissions.states.${record.state}`;
      const stateLabel = t(stateKey);
      readOnlyLabel =
        stateLabel !== stateKey
          ? stateLabel
          : t(`admin.admissions.uiStages.${resolveAdmissionUiStage(record)}`);
    }
  }

  return (
    <div className={cn('admissions-pipeline-status', className)}>
      <div className="admissions-pipeline-status__primary">
        <span className="admissions-pipeline-status__label tiny muted">
          {t('admin.admissions.detail.pipelineStage')}
        </span>
        {showManualSelect ? (
          <AdmissionUiStageSelect
            record={record}
            admissionId={admissionId}
            onChanged={onChanged}
            className="admission-ui-stage-select--detail"
          />
        ) : (
          <Badge
            tone={
              resolveAdmissionPrimaryDisplay(record).kind === 'ui_stage'
                ? admissionUiStageTone(resolveAdmissionUiStage(record))
                : resolveAdmissionPrimaryDisplay(record).tone
            }
          >
            {readOnlyLabel}
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
