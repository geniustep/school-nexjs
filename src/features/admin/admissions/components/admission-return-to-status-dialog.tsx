'use client';

import type { AdmissionDetail } from '@/types/admission';
import { AdmissionChangeStatusDialog } from './admission-change-status-dialog';

/** @deprecated 14A compatibility — prefer AdmissionChangeStatusDialog directly. */
export function AdmissionReturnToStatusDialog({
  admissionId,
  applicationName,
  currentStatus,
  allowedReturnTargets,
  open,
  onClose,
  onSuccess,
}: {
  admissionId: number;
  applicationName?: string | null;
  currentStatus?: string | null;
  allowedReturnTargets?: unknown;
  open: boolean;
  onClose: () => void;
  onSuccess: (detail?: AdmissionDetail) => void;
}) {
  return (
    <AdmissionChangeStatusDialog
      admissionId={admissionId}
      applicationName={applicationName}
      currentStatus={currentStatus}
      allowedStatusTargets={allowedReturnTargets}
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
