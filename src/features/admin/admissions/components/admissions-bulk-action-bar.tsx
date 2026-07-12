'use client';

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { patchAdmission } from '../api/admissions-api';
import {
  runBulkStageChange,
  type BulkStageChangeItem,
} from '../utils/admission-bulk-stage-change';
import type { DraggableAdmissionUiStage } from '../utils/admission-kanban-drag';
import type { AdmissionListItem } from '@/types/admission';

const BULK_STAGE_OPTIONS: DraggableAdmissionUiStage[] = [
  'new',
  'in_follow_up',
  'in_evaluation',
];

export function AdmissionsBulkActionBar({
  selectedItems,
  onClearSelection,
  onUpdated,
  onPartialFailure,
  className,
}: {
  selectedItems: AdmissionListItem[];
  onClearSelection: () => void;
  onUpdated?: () => void;
  onPartialFailure?: (failedIds: number[]) => void;
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [targetStage, setTargetStage] = useState<DraggableAdmissionUiStage>('in_follow_up');
  const [applying, setApplying] = useState(false);

  const bulkItems: BulkStageChangeItem[] = useMemo(
    () =>
      selectedItems.map((item) => ({
        id: item.id,
        record: {
          state: item.state,
          student_id: item.student_id,
          registration_flow_state: item.registration_flow_state,
        },
      })),
    [selectedItems],
  );

  const changeStateSilent = useCallback(
    async (admissionId: number, state: string): Promise<boolean> => {
      if (activeSchoolId == null) return false;
      const res = await patchAdmission(
        admissionId,
        { state },
        { active_school_id: activeSchoolId },
      );
      return res.success;
    },
    [activeSchoolId],
  );

  async function handleApplyStageChange() {
    if (applying || bulkItems.length === 0 || activeSchoolId == null) return;

    setApplying(true);
    const result = await runBulkStageChange(bulkItems, targetStage, changeStateSilent);
    setApplying(false);

    const { succeeded, failed, skipped } = result;

    if (failed.length === 0 && succeeded.length > 0) {
      toast.success(
        t('admin.admissions.bulk.stageChangeSuccess', { count: succeeded.length }),
      );
      onClearSelection();
      onUpdated?.();
      return;
    }

    if (failed.length > 0) {
      toast.error(
        t('admin.admissions.bulk.stageChangePartial', {
          success: succeeded.length,
          failed: failed.length,
        }),
      );
      onPartialFailure?.(failed);
      if (succeeded.length > 0) onUpdated?.();
      return;
    }

    if (skipped.length > 0 && succeeded.length === 0 && failed.length === 0) {
      toast.show(t('admin.admissions.bulk.stageChangeSkipped'), 'info');
      return;
    }

    toast.error(t('admin.admissions.bulk.stageChangeFailed'));
  }

  return (
    <div className={cn('admissions-bulk-bar', className)} role="region" aria-live="polite">
      <div className="admissions-bulk-bar__summary">
        <span className="admissions-bulk-bar__count">
          {t('admin.admissions.bulk.selectedCount', { count: selectedItems.length })}
        </span>
      </div>

      <div className="admissions-bulk-bar__actions">
        <label className="admissions-bulk-bar__field">
          <span className="tiny muted">{t('admin.admissions.bulk.changeStage')}</span>
          <select
            className="input admissions-bulk-bar__select"
            value={targetStage}
            disabled={applying}
            aria-label={t('admin.admissions.bulk.changeStage')}
            onChange={(e) => setTargetStage(e.target.value as DraggableAdmissionUiStage)}
          >
            {BULK_STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {t(`admin.admissions.uiStages.${stage}`)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={applying || selectedItems.length === 0}
          onClick={() => void handleApplyStageChange()}
        >
          {applying ? t('common.loading') : t('admin.admissions.bulk.applyStageChange')}
        </button>
      </div>

      <button
        type="button"
        className="btn btn--ghost btn--sm admissions-bulk-bar__clear"
        disabled={applying}
        onClick={onClearSelection}
      >
        {t('admin.admissions.bulk.clearSelection')}
      </button>
    </div>
  );
}
