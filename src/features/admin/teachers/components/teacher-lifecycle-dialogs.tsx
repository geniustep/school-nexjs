'use client';

import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import {
  archiveTeacher,
  reactivateTeacher,
  terminateTeacher,
} from '@/features/admin/teachers/api/teacher-domain-api';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherDetail, TeacherSummary } from '@/types/teacher-domain';

type LifecycleAction = 'terminate' | 'archive' | 'reactivate' | null;

export function TeacherLifecycleDialogs({
  teacher,
  action,
  onClose,
  onSuccess,
}: {
  teacher: TeacherSummary | TeacherDetail | null;
  action: LifecycleAction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!teacher || !action) return null;

  async function confirm() {
    if (!teacher) return;
    setFieldError(null);
    if (action === 'terminate' || action === 'archive') {
      if (!reason.trim()) {
        setFieldError(
          t(
            action === 'terminate'
              ? 'admin.teacherDomain.errors.terminateReasonRequired'
              : 'admin.teacherDomain.errors.archiveReasonRequired',
          ),
        );
        return;
      }
    }
    setSaving(true);
    const res =
      action === 'terminate'
        ? await terminateTeacher(teacher.id, {
            reason: reason.trim(),
            ...(endDate ? { employment_end_date: endDate } : {}),
          })
        : action === 'archive'
          ? await archiveTeacher(teacher.id, { reason: reason.trim() })
          : await reactivateTeacher(teacher.id);
    setSaving(false);
    if (!res.success) {
      toast.error(mapTeacherDomainError(res.error, t));
      return;
    }
    toast.success(
      t(
        action === 'terminate'
          ? 'admin.teacherDomain.toasts.terminated'
          : action === 'archive'
            ? 'admin.teacherDomain.toasts.archived'
            : 'admin.teacherDomain.toasts.reactivated',
      ),
    );
    setReason('');
    setEndDate('');
    onSuccess();
    onClose();
  }

  const title =
    action === 'terminate'
      ? t('admin.teacherDomain.lifecycle.terminateTitle')
      : action === 'archive'
        ? t('admin.teacherDomain.lifecycle.archiveTitle')
        : t('admin.teacherDomain.lifecycle.reactivateTitle');

  return (
    <ConfirmationDialog
      open
      title={title}
      variant={action === 'reactivate' ? 'primary' : 'danger'}
      size="form"
      loading={saving}
      closeOnBackdrop={!saving}
      onClose={onClose}
      onConfirm={confirm}
      confirmLabel={
        action === 'terminate'
          ? t('admin.teacherDomain.lifecycle.terminate')
          : action === 'archive'
            ? t('admin.teacherDomain.lifecycle.archive')
            : t('admin.teacherDomain.lifecycle.reactivate')
      }
      body={
        <div className="col teacher-lifecycle-dialog">
          <p className="tiny muted">
            {action === 'terminate'
              ? t('admin.teacherDomain.lifecycle.terminateWarning')
              : action === 'archive'
                ? t('admin.teacherDomain.lifecycle.archiveWarning')
                : t('admin.teacherDomain.lifecycle.reactivateWarning')}
          </p>
          <p className="teacher-lifecycle-dialog__name" dir="auto">
            {teacher.name}
          </p>
          {action === 'terminate' || action === 'archive' ? (
            <>
              <label className="field">
                <span>{t('admin.teacherDomain.lifecycle.reason')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                  aria-invalid={fieldError ? true : undefined}
                />
              </label>
              {action === 'terminate' ? (
                <label className="field">
                  <span>{t('admin.teacherDomain.lifecycle.employmentEndDate')}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    dir="ltr"
                  />
                </label>
              ) : null}
              {fieldError ? (
                <p className="form-error" role="alert" aria-live="polite">
                  {fieldError}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      }
    />
  );
}
