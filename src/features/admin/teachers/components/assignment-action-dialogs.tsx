'use client';

import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import {
  activateTeachingAssignment,
  cancelTeachingAssignment,
  endTeachingAssignment,
  resumeTeachingAssignment,
  suspendTeachingAssignment,
} from '@/features/admin/teachers/api/teacher-domain-api';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherAssignmentDetail, TeacherAssignmentSummary } from '@/types/teacher-domain';

export type AssignmentLifecycleAction =
  | 'activate'
  | 'suspend'
  | 'resume'
  | 'end'
  | 'cancel'
  | null;

export function AssignmentActionDialogs({
  assignment,
  action,
  onClose,
  onSuccess,
}: {
  assignment: TeacherAssignmentSummary | TeacherAssignmentDetail | null;
  action: AssignmentLifecycleAction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!assignment || !action) return null;

  async function confirm() {
    if (!assignment) return;
    setFieldError(null);
    if ((action === 'end' || action === 'cancel') && !reason.trim()) {
      setFieldError(t('admin.teacherDomain.errors.assignmentTerminationReasonRequired'));
      return;
    }
    setSaving(true);
    const res =
      action === 'activate'
        ? await activateTeachingAssignment(assignment.id)
        : action === 'suspend'
          ? await suspendTeachingAssignment(assignment.id)
          : action === 'resume'
            ? await resumeTeachingAssignment(assignment.id)
            : action === 'end'
              ? await endTeachingAssignment(assignment.id, {
                  reason: reason.trim(),
                  ...(effectiveTo ? { effective_to: effectiveTo } : {}),
                })
              : await cancelTeachingAssignment(assignment.id, { reason: reason.trim() });
    setSaving(false);
    if (!res.success) {
      toast.error(mapTeacherDomainError(res.error, t));
      return;
    }
    toast.success(t(`admin.teacherDomain.assignmentToasts.${action}`));
    setReason('');
    setEffectiveTo('');
    onSuccess();
    onClose();
  }

  const needsReason = action === 'end' || action === 'cancel';

  return (
    <ConfirmationDialog
      open
      title={t(`admin.teacherDomain.assignmentActions.${action}Title`)}
      variant={action === 'end' || action === 'cancel' || action === 'suspend' ? 'danger' : 'primary'}
      size={needsReason ? 'form' : 'default'}
      loading={saving}
      onClose={onClose}
      onConfirm={confirm}
      confirmLabel={t(`admin.teacherDomain.assignmentActions.${action}`)}
      body={
        <div className="col teacher-lifecycle-dialog">
          <p className="tiny muted">
            {t(`admin.teacherDomain.assignmentActions.${action}Warning`)}
          </p>
          {needsReason ? (
            <>
              <label className="field">
                <span>{t('admin.teacherDomain.lifecycle.reason')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </label>
              {action === 'end' ? (
                <label className="field">
                  <span>{t('admin.teacherDomain.assignmentActions.effectiveTo')}</span>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
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
