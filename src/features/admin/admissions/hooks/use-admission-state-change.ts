'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { patchAdmission } from '../api/admissions-api';
import { isFollowUpProcessingStage } from '../utils/admission-assessment-workflow-contract';
import { admissionApiErrorMessage } from '../utils/admission-errors';

export function useAdmissionStateChange(onSuccess?: () => void) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  const isPending = useCallback((admissionId: number) => pendingIds.has(admissionId), [pendingIds]);

  const changeState = useCallback(
    async (admissionId: number, state: string): Promise<boolean> => {
      if (activeSchoolId == null) return false;

      setPendingIds((prev) => new Set(prev).add(admissionId));
      const payload = isFollowUpProcessingStage(state)
        ? { processing_stage: state }
        : { state };
      const res = await patchAdmission(admissionId, payload, {
        active_school_id: activeSchoolId,
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(admissionId);
        return next;
      });

      if (res.success) {
        toast.success(t('admin.admissions.stateChange.success'));
        onSuccess?.();
        return true;
      }

      toast.error(admissionApiErrorMessage(res.error, t) || t('admin.admissions.stateChange.failed'));
      return false;
    },
    [activeSchoolId, onSuccess, t, toast],
  );

  return { changeState, isPending };
}
