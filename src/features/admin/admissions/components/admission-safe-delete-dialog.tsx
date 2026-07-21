'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { deleteAdmission, fetchAdmission } from '../api/admissions-api';
import { notifyAdmissionsQueriesInvalidated } from '../utils/admission-list-invalidate';
import { mapAdmissionSafeDeleteError } from '../utils/admission-safe-delete';
import type { AdmissionDetail } from '@/types/admission';

export function AdmissionSafeDeleteDialog({
  open,
  admissionId,
  applicationLabel,
  navigateOnSuccess = false,
  onClose,
  onSuccess,
  onConflictRefetch,
}: {
  open: boolean;
  admissionId: number | string;
  /** Existing student name or reference — no extra fetch. */
  applicationLabel?: string | null;
  /** When true (detail page), navigate to admissions list after success. */
  navigateOnSuccess?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** After 409 — refresh detail so can_delete may disappear. */
  onConflictRefetch?: (detail?: AdmissionDetail) => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const submitGuardRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setInlineError(null);
      submitGuardRef.current = false;
    }
  }, [open]);

  async function confirm() {
    if (loading || submitGuardRef.current) return;
    if (activeSchoolId == null) {
      setInlineError(t('admin.admissions.safeDelete.unknownError'));
      return;
    }
    submitGuardRef.current = true;
    setLoading(true);
    setInlineError(null);

    const res = await deleteAdmission(admissionId, { active_school_id: activeSchoolId });
    if (res.success) {
      toast.success(t('admin.admissions.safeDelete.success'));
      onClose();
      onSuccess?.();
      if (navigateOnSuccess) {
        router.replace('/admin/admissions');
      }
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }

    const mapped = mapAdmissionSafeDeleteError({
      ...res.error,
      status: typeof res.error.details?.status === 'number' ? res.error.details.status : undefined,
    });

    if (mapped.kind === 'not_found') {
      toast.error(t(mapped.messageKey));
      notifyAdmissionsQueriesInvalidated({
        reason: 'delete-not-found',
        admissionId,
      });
      onClose();
      onSuccess?.();
      if (navigateOnSuccess) {
        router.replace('/admin/admissions');
      }
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }

    if (mapped.kind === 'not_allowed') {
      setInlineError(t(mapped.messageKey));
      try {
        const refreshed = await fetchAdmission(admissionId, {
          active_school_id: activeSchoolId,
        });
        if (refreshed.success && refreshed.data) {
          onConflictRefetch?.(refreshed.data);
        } else {
          onConflictRefetch?.();
        }
      } catch {
        onConflictRefetch?.();
      }
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }

    if (mapped.kind === 'forbidden') {
      setInlineError(t(mapped.messageKey));
      setLoading(false);
      submitGuardRef.current = false;
      return;
    }

    setInlineError(t(mapped.messageKey));
    setLoading(false);
    submitGuardRef.current = false;
  }

  const label = applicationLabel?.trim() || null;

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.admissions.safeDelete.title')}
      variant="danger"
      closeOnBackdrop={!loading}
      loading={loading}
      confirmLabel={
        loading ? t('admin.admissions.safeDelete.submitting') : t('admin.admissions.safeDelete.confirm')
      }
      cancelLabel={t('common.cancel')}
      onConfirm={() => void confirm()}
      onClose={() => {
        if (!loading) onClose();
      }}
      body={
        <div data-testid="admission-safe-delete-dialog">
          {label ? (
            <p className="admission-safe-delete-dialog__label">
              <strong>{label}</strong>
            </p>
          ) : null}
          <p>{t('admin.admissions.safeDelete.description')}</p>
          {inlineError ? (
            <p className="form-error" role="alert">
              {inlineError}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
