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
import {
  admissionManualStageLabelKey,
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
  type AdmissionManualStage,
} from '../utils/admission-stage-options';
import type { AdmissionListItem } from '@/types/admission';

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
  const stageOptions = getAdmissionManualStageOptions();
  const [targetStage, setTargetStage] = useState<AdmissionManualStage>('contacted');
  const [applying, setApplying] = useState(false);

  const eligibleCount = useMemo(
    () => selectedItems.filter((item) => isAdmissionManualStage(String(item.state))).length,
    [selectedItems],
  );
  const ineligibleCount = selectedItems.length - eligibleCount;

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
    if (eligibleCount === 0) {
      toast.error(
        t('admin.admissions.bulk.stageChangeIneligible', { count: ineligibleCount }),
      );
      return;
    }

    setApplying(true);
    const result = await runBulkStageChange(bulkItems, targetStage, changeStateSilent);
    setApplying(false);

    const { succeeded, failed, skipped, ineligible } = result;

    if (ineligible.length > 0 && succeeded.length === 0 && failed.length === 0) {
      toast.error(
        t('admin.admissions.bulk.stageChangeIneligible', { count: ineligible.length }),
      );
      return;
    }

    if (failed.length === 0 && succeeded.length > 0) {
      const extra =
        ineligible.length > 0
          ? ` ${t('admin.admissions.bulk.stageChangeIneligibleNote', {
              count: ineligible.length,
            })}`
          : '';
      toast.success(
        `${t('admin.admissions.bulk.stageChangeSuccess', { count: succeeded.length })}${extra}`,
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
        {ineligibleCount > 0 ? (
          <span className="tiny muted">
            {t('admin.admissions.bulk.stageChangeIneligible', { count: ineligibleCount })}
          </span>
        ) : null}
      </div>

      <div className="admissions-bulk-bar__actions">
        <label className="admissions-bulk-bar__field">
          <span className="tiny muted">{t('admin.admissions.actions.changeFollowUp')}</span>
          <select
            className="input admissions-bulk-bar__select"
            value={targetStage}
            disabled={applying}
            aria-label={t('admin.admissions.actions.changeFollowUp')}
            data-testid="admissions-bulk-stage-select"
            onChange={(e) => setTargetStage(e.target.value as AdmissionManualStage)}
          >
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {t(admissionManualStageLabelKey(stage))}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={applying || selectedItems.length === 0 || eligibleCount === 0}
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
